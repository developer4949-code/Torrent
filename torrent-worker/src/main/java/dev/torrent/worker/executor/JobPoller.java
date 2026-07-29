package dev.torrent.worker.executor;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class JobPoller {

    private static final Logger log = LoggerFactory.getLogger(JobPoller.class);
    
    private final JobRepository jobRepository;
    private final JobExecutor jobExecutor;

    @Value("${torrent.worker.id}")
    private String workerId;

    public JobPoller(JobRepository jobRepository, JobExecutor jobExecutor) {
        this.jobRepository = jobRepository;
        this.jobExecutor = jobExecutor;
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void pollForJobs() {
        Optional<Job> acquired = jobRepository.acquireNextJob();
        if (acquired.isPresent()) {
            Job job = acquired.get();
            log.info("Worker {} acquired job {}", workerId, job.getId());
            job.setStatus(JobStatus.RUNNING);
            job.setWorkerId(workerId);
            job.setStartedAt(OffsetDateTime.now());
            job.setAttemptCount(job.getAttemptCount() + 1);
            jobRepository.save(job);
            
            jobExecutor.execute(job);
        }
    }
}
