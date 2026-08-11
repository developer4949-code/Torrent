package dev.torrent.admin.dto;

import java.time.OffsetDateTime;

public class WorkerStatusDto {
    private String workerId;
    private String hostname;
    private OffsetDateTime registeredAt;
    private boolean isAlive;

    public WorkerStatusDto(String workerId, String hostname, OffsetDateTime registeredAt, boolean isAlive) {
        this.workerId = workerId;
        this.hostname = hostname;
        this.registeredAt = registeredAt;
        this.isAlive = isAlive;
    }

    public String getWorkerId() { return workerId; }
    public String getHostname() { return hostname; }
    public OffsetDateTime getRegisteredAt() { return registeredAt; }
    public boolean isAlive() { return isAlive; }
}
