package dev.torrent.worker.executor;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import dev.torrent.common.service.ClusterLogger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

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
                logger.log("WORKER", "Successfully executed Job " + job.getId() + " (" + job.getJobType() + ") on node " + job.getWorkerId());
                
                fireWebhook(current);
                
                // DAG Resolution
                java.util.List<Job> children = jobRepository.findChildrenWaitingOn(current.getId());
                for (Job child : children) {
                    if (child.getStatus() == JobStatus.DEPENDENCY_WAIT) {
                        boolean allMet = true;
                        if (child.getDependencies() != null) {
                            for (java.util.UUID parentId : child.getDependencies()) {
                                Job parent = jobRepository.findById(parentId).orElse(null);
                                if (parent == null || parent.getStatus() != JobStatus.COMPLETED) {
                                    allMet = false;
                                    break;
                                }
                            }
                        }
                        if (allMet) {
                            child.setStatus(JobStatus.PENDING);
                            jobRepository.save(child);
                            logger.log("WORKER", "DAG Cascade: All dependencies met for Job " + child.getId() + ". Promoted to PENDING.");
                        }
                    }
                }
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
                    logger.log("WORKER", "Job " + job.getId() + " failed permanently on node " + job.getWorkerId() + "! Max attempts reached.");
                    jobRepository.save(current);
                    fireWebhook(current);
                }
            }
        });
    }

    private void fireWebhook(Job job) {
        if (job.getWebhookUrl() == null || job.getWebhookUrl().isBlank()) return;
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
            String payload = String.format("{\"id\":\"%s\", \"status\":\"%s\"}", job.getId(), job.getStatus());
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(job.getWebhookUrl()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                  .thenAccept(res -> logger.log("WORKER", "Fired webhook for Job " + job.getId() + " (HTTP " + res.statusCode() + ")"))
                  .exceptionally(ex -> {
                      logger.log("WORKER", "Failed to fire webhook for Job " + job.getId() + ": " + ex.getMessage());
                      return null;
                  });
        } catch (Exception ex) {
            logger.log("WORKER", "Error configuring webhook: " + ex.getMessage());
        }
    }
}
