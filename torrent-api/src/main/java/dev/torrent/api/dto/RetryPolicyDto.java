package dev.torrent.api.dto;

import jakarta.validation.constraints.Min;

public record RetryPolicyDto(
    @Min(0) Integer maxAttempts,
    @Min(1) Double backoffMultiplier,
    @Min(1) Integer maxBackoffSeconds
) {}
