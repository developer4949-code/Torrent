package dev.torrent.worker.integration;

import dev.torrent.common.domain.Job;
import dev.torrent.common.domain.JobPriority;
import dev.torrent.common.domain.JobStatus;
import dev.torrent.common.repository.JobRepository;
import dev.torrent.worker.executor.JobExecutor;
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
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
public class ConcurrentWorkerIT {

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
    private JobExecutor jobExecutor;

    @BeforeEach
    void setUp() {
        jobRepository.deleteAll();
    }

    @Test
    void exactlyOneWorkerExecutesJob() throws Exception {
        // Submit 1 job
        Job job = new Job();
        job.setIdempotencyKey("concurrent-test-1");
        job.setJobType("TEST_JOB");
        job.setPayload("{}");
        job.setScheduledAt(OffsetDateTime.now().minusMinutes(1)); // due immediately
        job.setStatus(JobStatus.SCHEDULED);
        job.setPriority(JobPriority.STANDARD);
        jobRepository.save(job);

        // start 3 workers concurrently
        int workerCount = 3;
        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(workerCount);

        for (int i = 0; i < workerCount; i++) {
            final String workerId = "test-worker-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    JobPoller poller = new JobPoller(jobRepository, jobExecutor);
                    java.lang.reflect.Field workerIdField = JobPoller.class.getDeclaredField("workerId");
                    workerIdField.setAccessible(true);
                    workerIdField.set(poller, workerId);
                    
                    poller.pollForJobs();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Unleash the workers concurrently
        startLatch.countDown();
        doneLatch.await(5, TimeUnit.SECONDS);

        // Wait a bit for async execution to complete
        Thread.sleep(1000);

        List<Job> jobs = jobRepository.findAll();
        assertThat(jobs).hasSize(1);
        
        Job executedJob = jobs.get(0);
        // Assert exactly 1 COMPLETED record in DB
        assertThat(executedJob.getStatus()).isEqualTo(JobStatus.COMPLETED);
        // Assert attempt count is 1 (no duplicates)
        assertThat(executedJob.getAttemptCount()).isEqualTo(1);
        // Worker ID should be one of our test workers
        assertThat(executedJob.getWorkerId()).startsWith("test-worker-");
    }
}
