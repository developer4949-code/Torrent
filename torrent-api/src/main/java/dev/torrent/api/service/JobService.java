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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final CronParser parser = new CronParser(CronDefinitionBuilder.instanceDefinitionFor(CronType.UNIX));

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
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
        
        OffsetDateTime scheduledAt = computeNextExecutionTime(request.schedule().expression());
        job.setScheduledAt(scheduledAt);
        job.setStatus(JobStatus.PENDING);

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
        return new SubmissionResult(savedJob, false);
    }

    private OffsetDateTime computeNextExecutionTime(String cronExpression) {
        ExecutionTime executionTime = ExecutionTime.forCron(parser.parse(cronExpression));
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("UTC"));
        return executionTime.nextExecution(now)
                .orElse(now)
                .toOffsetDateTime();
    }

    public record SubmissionResult(Job job, boolean isDuplicate) {}
}
