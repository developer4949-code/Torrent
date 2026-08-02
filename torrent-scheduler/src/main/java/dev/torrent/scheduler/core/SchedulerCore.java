package dev.torrent.scheduler.core;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class SchedulerCore {

    private static final Logger log = LoggerFactory.getLogger(SchedulerCore.class);
    
    private final JdbcTemplate jdbcTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public SchedulerCore(JdbcTemplate jdbcTemplate, KafkaTemplate<String, String> kafkaTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 10000)
    @SchedulerLock(name = "job_scheduler_lock", lockAtLeastFor = "5s", lockAtMostFor = "20s")
    public void transitionJobs() {
        log.info("SchedulerCore acquired lock. Checking for due PENDING jobs...");
        
        List<UUID> transitionedJobIds = jdbcTemplate.queryForList(
            "UPDATE jobs SET status = 'SCHEDULED' WHERE status = 'PENDING' AND scheduled_at <= NOW() RETURNING id",
            UUID.class
        );
        
        if (!transitionedJobIds.isEmpty()) {
            log.info("Successfully transitioned {} jobs from PENDING to SCHEDULED.", transitionedJobIds.size());
            for (UUID id : transitionedJobIds) {
                kafkaTemplate.send("torrent.jobs.scheduled", id.toString());
                log.debug("Published Job ID {} to Kafka topic torrent.jobs.scheduled", id);
            }
        } else {
            log.debug("No PENDING jobs due for execution at this time.");
        }
    }
}
