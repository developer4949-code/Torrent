package dev.torrent.worker.grpc;

import dev.torrent.common.domain.Job;
import dev.torrent.common.repository.JobRepository;
import dev.torrent.grpc.JobExecutionRequest;
import dev.torrent.grpc.JobExecutionResponse;
import dev.torrent.grpc.JobExecutionServiceGrpc;
import dev.torrent.worker.executor.JobExecutor;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;
import java.util.UUID;
import dev.torrent.common.service.ClusterLogger;

@GrpcService
public class FastTrackExecutionService extends JobExecutionServiceGrpc.JobExecutionServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(FastTrackExecutionService.class);
    
    private final JobRepository jobRepository;
    private final JobExecutor jobExecutor;
    private final ClusterLogger logger;

    public FastTrackExecutionService(JobRepository jobRepository, JobExecutor jobExecutor, ClusterLogger logger) {
        this.jobRepository = jobRepository;
        this.jobExecutor = jobExecutor;
        this.logger = logger;
    }

    @Override
    public void executeJob(JobExecutionRequest request, StreamObserver<JobExecutionResponse> responseObserver) {
        try {
            UUID jobId = UUID.fromString(request.getJobId());
            log.info("Received gRPC fast-track request for Job ID: {}", jobId);

            Optional<Job> optionalJob = jobRepository.findById(jobId);
            if (optionalJob.isPresent()) {
                Job job = optionalJob.get();
                logger.log("gRPC", "Consumed Job " + job.getId() + " via Fast-Track Stream");
                jobExecutor.execute(job);
                
                responseObserver.onNext(JobExecutionResponse.newBuilder()
                        .setSuccess(true)
                        .setMessage("Job submitted to executor successfully")
                        .build());
            } else {
                log.warn("gRPC fast-track request for non-existent Job ID: {}", jobId);
                responseObserver.onNext(JobExecutionResponse.newBuilder()
                        .setSuccess(false)
                        .setMessage("Job not found")
                        .build());
            }
        } catch (Exception e) {
            log.error("Error processing gRPC fast-track request", e);
            responseObserver.onNext(JobExecutionResponse.newBuilder()
                    .setSuccess(false)
                    .setMessage("Error: " + e.getMessage())
                    .build());
        } finally {
            responseObserver.onCompleted();
        }
    }
}
