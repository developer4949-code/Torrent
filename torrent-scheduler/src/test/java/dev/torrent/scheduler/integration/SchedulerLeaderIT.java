package dev.torrent.scheduler.integration;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobPriority;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@Testcontainers
public class SchedulerLeaderIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jobRepository.deleteAll();
        jdbcTemplate.execute("DELETE FROM shedlock");
    }

    @Test
    void schedulerTransitionsPendingJobAndAcquiresLock() {
        Job job = new Job();
        job.setIdempotencyKey("scheduler-test-1");
        job.setJobType("TEST_SCHEDULER");
        job.setPayload("{}");
        job.setScheduledAt(OffsetDateTime.now().minusMinutes(1)); // Due immediately
        job.setStatus(JobStatus.PENDING);
        job.setPriority(JobPriority.STANDARD);
        jobRepository.save(job);

        // The SchedulerCore runs every 10 seconds automatically.
        // Wait for it to pick up and transition the job.
        await().atMost(15, TimeUnit.SECONDS).until(() -> {
            Job j = jobRepository.findAll().get(0);
            return j.getStatus() == JobStatus.SCHEDULED;
        });

        // Verify ShedLock table has an entry for our lock
        Integer lockCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM shedlock WHERE name = 'job_scheduler_lock'", Integer.class);
        
        assertThat(lockCount).isEqualTo(1);
    }
}
