package dev.torrent.api.controller;

import dev.torrent.api.dto.JobRequestDto;
import dev.torrent.api.dto.JobResponseDto;
import dev.torrent.api.service.JobService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobSubmissionController {

    private final JobService jobService;

    public JobSubmissionController(JobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping
    public ResponseEntity<JobResponseDto> submitJob(@Valid @RequestBody JobRequestDto request) {
        JobService.SubmissionResult result = jobService.submitJob(request);
        JobResponseDto response = new JobResponseDto(result.job().getId());
        
        if (result.isDuplicate()) {
            return ResponseEntity.status(HttpStatus.OK).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }
    }
}
