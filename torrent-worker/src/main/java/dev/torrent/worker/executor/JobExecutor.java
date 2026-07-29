package dev.torrent.worker.executor;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
public class JobExecutor {

    private final ThreadPoolTaskExecutor taskExecutor;
    private final JobRepository jobRepository;

    public JobExecutor(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
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
                
                // Job completed
                Job current = jobRepository.findById(job.getId()).orElse(job);
                current.setStatus(JobStatus.COMPLETED);
                current.setCompletedAt(OffsetDateTime.now());
                jobRepository.save(current);
            } catch (Exception e) {
                // Job failed
                Job current = jobRepository.findById(job.getId()).orElse(job);
                current.setStatus(JobStatus.FAILED);
                current.setCompletedAt(OffsetDateTime.now());
                current.setErrorMessage(e.getMessage());
                jobRepository.save(current);
            }
        });
    }
}
