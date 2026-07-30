package dev.torrent.admin.controller;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/jobs")
@Tag(name = "Admin Jobs API", description = "Endpoints for managing the Dead Letter Queue and job retries")
public class AdminController {

    private final JobRepository jobRepository;

    public AdminController(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @GetMapping("/dead")
    @Operation(summary = "Get Dead Letter Queue", description = "Retrieves all jobs that have reached the maximum number of retry attempts and are in the DEAD state.")
    public ResponseEntity<List<Job>> getDeadJobs() {
        List<Job> deadJobs = jobRepository.findByStatus(JobStatus.DEAD);
        return ResponseEntity.ok(deadJobs);
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
