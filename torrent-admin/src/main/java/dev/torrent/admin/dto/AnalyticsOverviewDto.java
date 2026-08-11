package dev.torrent.admin.dto;

import java.util.Map;
import dev.torrent.common.domain.JobStatus;

public record AnalyticsOverviewDto(
    long totalJobs,
    long activeWorkers,
    Map<JobStatus, Long> jobsByStatus
) {}
