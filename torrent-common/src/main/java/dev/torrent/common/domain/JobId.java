package dev.torrent.common.domain;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

public class JobId implements Serializable {
    private UUID id;
    private OffsetDateTime scheduledAt;

    public JobId() {}

    public JobId(UUID id, OffsetDateTime scheduledAt) {
        this.id = id;
        this.scheduledAt = scheduledAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public OffsetDateTime getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(OffsetDateTime scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        JobId jobId = (JobId) o;
        return Objects.equals(id, jobId.id) &&
               Objects.equals(scheduledAt, jobId.scheduledAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, scheduledAt);
    }
}
