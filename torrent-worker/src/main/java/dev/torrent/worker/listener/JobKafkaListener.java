package dev.torrent.worker.listener;

import dev.torrent.common.domain.Job;
import dev.torrent.common.repository.JobRepository;
import dev.torrent.worker.executor.JobExecutor;
import dev.torrent.worker.heartbeat.WorkerHeartbeat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import dev.torrent.common.service.ClusterLogger;

@Component
public class JobKafkaListener {

    private static final Logger log = LoggerFactory.getLogger(JobKafkaListener.class);

    private final JobRepository jobRepository;
    private final JobExecutor jobExecutor;
    private final ClusterLogger logger;
    private final WorkerHeartbeat workerHeartbeat;

    public JobKafkaListener(JobRepository jobRepository, JobExecutor jobExecutor, ClusterLogger logger, WorkerHeartbeat workerHeartbeat) {
        this.jobRepository = jobRepository;
        this.jobExecutor = jobExecutor;
        this.logger = logger;
        this.workerHeartbeat = workerHeartbeat;
    }

    @KafkaListener(topics = "torrent.jobs.scheduled", groupId = "torrent-worker-group")
    public void onMessage(String message) {
        try {
            UUID jobId = UUID.fromString(message);
            log.info("Received Kafka message for Job ID: {}", jobId);
            
            // Check if job exists
            Optional<Job> optionalJob = jobRepository.findById(jobId);
            if (optionalJob.isPresent()) {
                Job job = optionalJob.get();
                job.setWorkerId(workerHeartbeat.getWorkerId());
                jobRepository.save(job);
                log.info("Submitting Job ID: {} to JobExecutor", job.getId());
                logger.log("KAFKA", "Consumed Job " + job.getId() + " from topic: torrent.jobs.scheduled by " + workerHeartbeat.getWorkerId());
                jobExecutor.execute(job);
            } else {
                log.warn("Received message for non-existent Job ID: {}", jobId);
            }
        } catch (IllegalArgumentException e) {
            log.error("Invalid Job ID received from Kafka: {}", message, e);
        }
    }
}
