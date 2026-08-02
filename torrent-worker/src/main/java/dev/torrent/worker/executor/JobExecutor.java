package dev.torrent.worker.executor;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import dev.torrent.common.service.ClusterLogger;

@Component
public class JobExecutor {

    private final ThreadPoolTaskExecutor taskExecutor;
    private final JobRepository jobRepository;
    private final ClusterLogger logger;

    public JobExecutor(JobRepository jobRepository, ClusterLogger logger) {
        this.jobRepository = jobRepository;
        this.logger = logger;
        this.taskExecutor = new ThreadPoolTaskExecutor();
        this.taskExecutor.setCorePoolSize(10);
        this.taskExecutor.setMaxPoolSize(50);
        this.taskExecutor.setQueueCapacity(100);
        this.taskExecutor.setThreadNamePrefix("worker-exec-");
        this.taskExecutor.initialize();
    }

    public void execute(Job job) {
        taskExecutor.submit(() -> {
            try {
                // Simulate job execution
                Thread.sleep(500);
                if ("FAILING_JOB".equals(job.getJobType())) {
                    throw new RuntimeException("Simulated job failure");
                }
                
                // Job completed
                Job current = jobRepository.findById(job.getId()).orElse(job);
                current.setAttemptCount(current.getAttemptCount() + 1);
                current.setStatus(JobStatus.COMPLETED);
                current.setCompletedAt(OffsetDateTime.now());
                jobRepository.save(current);
                logger.log("WORKER", "Successfully executed Job " + job.getId() + " (" + job.getJobType() + ")");
            } catch (Exception e) {
                // Job failed
                Job current = jobRepository.findById(job.getId()).orElse(job);
                current.setAttemptCount(current.getAttemptCount() + 1);
                
                if (current.getAttemptCount() < current.getMaxAttempts()) {
                    long delaySeconds = (long) (5 * Math.pow(current.getBackoffMultiplier(), current.getAttemptCount() - 1));
                    delaySeconds = Math.min(delaySeconds, current.getMaxBackoffSeconds());
                    
                    current.setStatus(JobStatus.SCHEDULED);
                    current.setScheduledAt(OffsetDateTime.now().plusSeconds(delaySeconds));
                    current.setErrorMessage(e.getMessage());
                } else {
                    current.setStatus(JobStatus.DEAD);
                    current.setCompletedAt(OffsetDateTime.now());
                    current.setErrorMessage(e.getMessage());
                    logger.log("WORKER", "Job " + job.getId() + " failed permanently! Max attempts reached.");
                }
                jobRepository.save(current);
            }
        });
    }
}
