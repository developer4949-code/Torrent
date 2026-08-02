package dev.torrent.scheduler;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;

@SpringBootApplication(scanBasePackages = "dev.torrent")
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")
@EntityScan(basePackages = "dev.torrent.common.domain")
@EnableJpaRepositories(basePackages = "dev.torrent.common.repository")
public class TorrentSchedulerApplication {
    public static void main(String[] args) {
        SpringApplication.run(TorrentSchedulerApplication.class, args);
    }
}
