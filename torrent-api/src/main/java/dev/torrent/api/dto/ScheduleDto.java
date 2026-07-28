package dev.torrent.api.dto;

import dev.torrent.api.validation.ValidCron;
import jakarta.validation.constraints.NotBlank;

public record ScheduleDto(
    @NotBlank String type,
    @NotBlank @ValidCron String expression
) {}
