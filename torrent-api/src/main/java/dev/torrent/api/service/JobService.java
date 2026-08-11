package dev.torrent.api.service;

import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;
import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobPriority;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.api.dto.JobRequestDto;
import dev.torrent.common.repository.JobRepository;
import dev.torrent.common.service.ClusterLogger;
import dev.torrent.grpc.JobExecutionRequest;
import dev.torrent.grpc.JobExecutionResponse;
import dev.torrent.grpc.JobExecutionServiceGrpc;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.List;

@Service
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);

    @GrpcClient("fastTrack")
    private JobExecutionServiceGrpc.JobExecutionServiceBlockingStub fastTrackStub;

    private final JobRepository jobRepository;
    private final ClusterLogger logger;
    private final CronParser parser = new CronParser(CronDefinitionBuilder.instanceDefinitionFor(CronType.UNIX));

    public JobService(JobRepository jobRepository, ClusterLogger logger) {
        this.jobRepository = jobRepository;
        this.logger = logger;
    }

    @Transactional
    public SubmissionResult submitJob(JobRequestDto request) {
        Optional<Job> existingJob = jobRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existingJob.isPresent()) {
            return new SubmissionResult(existingJob.get(), true);
        }

        Job job = new Job();
        job.setIdempotencyKey(request.idempotencyKey());
        job.setJobType(request.jobType());
        job.setPayload(request.payload().toString());
        job.setPriority(request.priority() != null ? request.priority() : JobPriority.STANDARD);
        job.setWebhookUrl(request.webhookUrl());
        
        OffsetDateTime scheduledAt = computeNextExecutionTime(request.schedule().expression());
        job.setScheduledAt(scheduledAt);
        
        if (request.dependencies() != null && !request.dependencies().isEmpty()) {
            job.setDependencies(request.dependencies());
            job.setStatus(JobStatus.DEPENDENCY_WAIT);
            logger.log("API-GATEWAY", "Job DAG: Waiting for " + request.dependencies().size() + " dependencies to finish.");
        } else {
            job.setStatus(JobStatus.PENDING);
        }

        if (request.retryPolicy() != null) {
            if (request.retryPolicy().maxAttempts() != null) {
                job.setMaxAttempts(request.retryPolicy().maxAttempts());
            }
            if (request.retryPolicy().backoffMultiplier() != null) {
                job.setBackoffMultiplier(request.retryPolicy().backoffMultiplier());
            }
            if (request.retryPolicy().maxBackoffSeconds() != null) {
                job.setMaxBackoffSeconds(request.retryPolicy().maxBackoffSeconds());
            }
        }
        if (request.timeoutSeconds() != null) {
            job.setTimeoutSeconds(request.timeoutSeconds());
        }

        Job savedJob = jobRepository.save(job);
        logger.log("API-GATEWAY", "Job " + savedJob.getId() + " (" + savedJob.getJobType() + ") saved to PostgreSQL");
        
        if (savedJob.getPriority() == JobPriority.HIGH && savedJob.getStatus() != JobStatus.DEPENDENCY_WAIT) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    logger.log("gRPC", "Fast-tracking HIGH priority job " + savedJob.getId() + " directly to Worker via gRPC");
                    try {
                        JobExecutionRequest grpcRequest = JobExecutionRequest.newBuilder()
                                .setJobId(savedJob.getId().toString())
                                .build();
                        JobExecutionResponse response = fastTrackStub.executeJob(grpcRequest);
                        
                        if (response.getSuccess()) {
                            log.info("gRPC fast-track execution accepted for Job {}", savedJob.getId());
                        } else {
                            log.warn("gRPC fast-track execution rejected for Job {}: {}", savedJob.getId(), response.getMessage());
                        }
                    } catch (Exception e) {
                        log.warn("Failed to trigger gRPC fast-track for Job {}. It will fallback to standard Scheduler queue. Error: {}", savedJob.getId(), e.getMessage());
                    }
                }
            });
        }
        
        return new SubmissionResult(savedJob, false);
    }

    private OffsetDateTime computeNextExecutionTime(String cronExpression) {
        ExecutionTime executionTime = ExecutionTime.forCron(parser.parse(cronExpression));
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("UTC"));
        return executionTime.nextExecution(now)
                .orElse(now)
                .toOffsetDateTime();
    }

    public List<Job> getRecentJobs() {
        return jobRepository.findTop50ByOrderByScheduledAtDesc();
    }

    public record SubmissionResult(Job job, boolean isDuplicate) {}
}
