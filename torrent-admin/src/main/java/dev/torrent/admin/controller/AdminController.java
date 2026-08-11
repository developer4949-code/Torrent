package dev.torrent.admin.controller;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.redis.core.StringRedisTemplate;
import dev.torrent.common.domain.Worker;
import dev.torrent.common.repository.WorkerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import dev.torrent.admin.dto.AnalyticsOverviewDto;
import dev.torrent.admin.dto.WorkerStatusDto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/v1/admin/jobs")
@Tag(name = "Admin Jobs API", description = "Endpoints for managing the Dead Letter Queue and job retries")
public class AdminController {

    private final JobRepository jobRepository;
    private final WorkerRepository workerRepository;
    private final StringRedisTemplate redisTemplate;

    public AdminController(JobRepository jobRepository, WorkerRepository workerRepository, StringRedisTemplate redisTemplate) {
        this.jobRepository = jobRepository;
        this.workerRepository = workerRepository;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/dead")
    @Operation(summary = "Get Dead Letter Queue", description = "Retrieves all jobs that have reached the maximum number of retry attempts and are in the DEAD state.")
    public ResponseEntity<List<Job>> getDeadJobs() {
        List<Job> deadJobs = jobRepository.findByStatus(JobStatus.DEAD);
        return ResponseEntity.ok(deadJobs);
    }

    @GetMapping
    @Operation(summary = "Get all jobs", description = "Retrieves a paginated list of all jobs.")
    public ResponseEntity<Page<Job>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<Job> jobs = jobRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/analytics/overview")
    @Operation(summary = "Get Analytics Overview", description = "Retrieves aggregate data about jobs and workers.")
    public ResponseEntity<AnalyticsOverviewDto> getAnalyticsOverview() {
        long totalJobs = jobRepository.count();
        List<Worker> workers = workerRepository.findAll();
        long activeWorkers = workers.stream().filter(worker -> 
            Boolean.TRUE.equals(redisTemplate.hasKey("worker:" + worker.getWorkerId() + ":heartbeat"))
        ).count();

        Map<JobStatus, Long> jobsByStatus = new HashMap<>();
        for (JobStatus status : JobStatus.values()) {
            jobsByStatus.put(status, jobRepository.countByStatus(status));
        }

        return ResponseEntity.ok(new AnalyticsOverviewDto(totalJobs, activeWorkers, jobsByStatus));
    }

    @GetMapping("/workers")
    @Operation(summary = "Get Cluster Worker Status", description = "Retrieves all registered worker nodes and their live heartbeat status from Redis.")
    public ResponseEntity<List<WorkerStatusDto>> getWorkers() {
        List<Worker> workers = workerRepository.findAll();
        List<WorkerStatusDto> dtos = workers.stream().map(worker -> {
            String key = "worker:" + worker.getWorkerId() + ":heartbeat";
            boolean isAlive = Boolean.TRUE.equals(redisTemplate.hasKey(key));
            return new WorkerStatusDto(worker.getWorkerId(), worker.getHostname(), worker.getRegisteredAt(), isAlive);
        }).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{id}/retry")
    @Operation(summary = "Manual Retry", description = "Resets the attempt count of a DEAD job and requeues it for execution immediately.")
    public ResponseEntity<Job> retryDeadJob(@PathVariable UUID id) {
        return jobRepository.findById(id).map(job -> {
            if (job.getStatus() != JobStatus.DEAD) {
                return ResponseEntity.badRequest().body(job);
            }
            
            job.setAttemptCount(0);
            job.setStatus(JobStatus.SCHEDULED);
            job.setScheduledAt(OffsetDateTime.now());
            job.setErrorMessage(null);
            
            Job saved = jobRepository.save(job);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
