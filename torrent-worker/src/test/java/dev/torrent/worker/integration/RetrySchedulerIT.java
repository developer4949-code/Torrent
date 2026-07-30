package dev.torrent.worker.integration;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobPriority;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import dev.torrent.worker.executor.JobPoller;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@Testcontainers
public class RetrySchedulerIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private JobPoller jobPoller;

    @BeforeEach
    void setUp() {
        jobRepository.deleteAll();
    }

    @Test
    void failingJobRetriesAndGoesToDeadLetterQueue() {
        Job job = new Job();
        job.setIdempotencyKey("retry-test-1");
        job.setJobType("FAILING_JOB");
        job.setPayload("{}");
        job.setScheduledAt(OffsetDateTime.now().minusMinutes(1));
        job.setStatus(JobStatus.SCHEDULED);
        job.setPriority(JobPriority.STANDARD);
        job.setMaxAttempts(3);
        jobRepository.save(job);

        // Attempt 1
        jobPoller.pollForJobs();
        await().atMost(5, TimeUnit.SECONDS).until(() -> {
            Job j = jobRepository.findAll().get(0);
            return j.getStatus() == JobStatus.SCHEDULED && j.getAttemptCount() == 1;
        });

        // Fast-forward time
        Job j1 = jobRepository.findAll().get(0);
        j1.setScheduledAt(OffsetDateTime.now().minusMinutes(1));
        jobRepository.save(j1);

        // Attempt 2
        jobPoller.pollForJobs();
        await().atMost(5, TimeUnit.SECONDS).until(() -> {
            Job j = jobRepository.findAll().get(0);
            return j.getStatus() == JobStatus.SCHEDULED && j.getAttemptCount() == 2;
        });

        // Fast-forward time
        Job j2 = jobRepository.findAll().get(0);
        j2.setScheduledAt(OffsetDateTime.now().minusMinutes(1));
        jobRepository.save(j2);

        // Attempt 3 (reaches maxAttempts)
        jobPoller.pollForJobs();
        await().atMost(5, TimeUnit.SECONDS).until(() -> {
            Job j = jobRepository.findAll().get(0);
            return j.getStatus() == JobStatus.DEAD && j.getAttemptCount() == 3;
        });

        Job finalJob = jobRepository.findAll().get(0);
        assertThat(finalJob.getStatus()).isEqualTo(JobStatus.DEAD);
        assertThat(finalJob.getErrorMessage()).isEqualTo("Simulated job failure");
    }
}
