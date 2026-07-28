package dev.torrent.api.repository;

import dev.torrent.api.domain.Job;
import dev.torrent.api.domain.JobId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, JobId> {
    Optional<Job> findByIdempotencyKey(String idempotencyKey);
    Optional<Job> findById(UUID id);
}
