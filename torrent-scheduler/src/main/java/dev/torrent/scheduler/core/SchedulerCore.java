package dev.torrent.scheduler.core;

import dev.torrent.common.repository.JobRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SchedulerCore {

    private static final Logger log = LoggerFactory.getLogger(SchedulerCore.class);
    
    private final JobRepository jobRepository;

    public SchedulerCore(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @Scheduled(fixedDelay = 10000)
    @SchedulerLock(name = "job_scheduler_lock", lockAtLeastFor = "5s", lockAtMostFor = "20s")
    public void transitionJobs() {
        log.info("SchedulerCore acquired lock. Checking for due PENDING jobs...");
        int updatedCount = jobRepository.transitionPendingToScheduled();
        if (updatedCount > 0) {
            log.info("Successfully transitioned {} jobs from PENDING to SCHEDULED.", updatedCount);
        } else {
            log.debug("No PENDING jobs due for execution at this time.");
        }
    }
}
