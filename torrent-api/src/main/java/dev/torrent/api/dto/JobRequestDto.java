package dev.torrent.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import dev.torrent.common.domain.JobPriority;
import dev.torrent.api.validation.ValidCron;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JobRequestDto(
    @NotBlank String idempotencyKey,
    @NotBlank String jobType,
    @NotNull JsonNode payload,
    @NotNull @Valid ScheduleDto schedule,
    @NotNull JobPriority priority,
    @Valid RetryPolicyDto retryPolicy,
    @Min(1) Integer timeoutSeconds
) {}
