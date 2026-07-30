package dev.torrent.common.repository;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, JobId> {
    Optional<Job> findByIdempotencyKey(String idempotencyKey);
    Optional<Job> findById(UUID id);
    List<Job> findByStatus(dev.torrent.common.domain.JobStatus status);

    @Query(value = """
        SELECT * FROM jobs
        WHERE status IN ('PENDING', 'SCHEDULED')
          AND scheduled_at <= NOW()
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    Optional<Job> acquireNextJob();
}
