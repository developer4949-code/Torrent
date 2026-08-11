package dev.torrent.api.controller;

import dev.torrent.common.repository.JobRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/cluster")
@CrossOrigin(origins = "*")
public class ClusterMetricsController {

    private final StringRedisTemplate redisTemplate;
    private final JobRepository jobRepository;

    public ClusterMetricsController(StringRedisTemplate redisTemplate, JobRepository jobRepository) {
        this.redisTemplate = redisTemplate;
        this.jobRepository = jobRepository;
    }

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Count active workers via Redis keys
        Set<String> workerKeys = redisTemplate.keys("worker:*");
        metrics.put("activeWorkers", workerKeys != null ? workerKeys.size() : 0);
        
        // Use PENDING jobs as a proxy for Kafka queue backlog
        long pendingJobs = jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.PENDING);
        metrics.put("kafkaLag", pendingJobs);

        metrics.put("totalJobs", jobRepository.count());
        metrics.put("completedJobs", jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.COMPLETED));
        metrics.put("failedJobs", 
            jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.FAILED) + 
            jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.DEAD) +
            jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.TIMED_OUT)
        );
        metrics.put("activeJobs", 
            jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.RUNNING) + 
            pendingJobs +
            jobRepository.countByStatus(dev.torrent.common.domain.JobStatus.SCHEDULED)
        );

        return metrics;
    }
}
