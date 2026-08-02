package dev.torrent.worker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "dev.torrent")
@EntityScan(basePackages = "dev.torrent.common.domain")
@EnableJpaRepositories(basePackages = "dev.torrent.common.repository")
@EnableScheduling
public class TorrentWorkerApplication {
    public static void main(String[] args) {
        SpringApplication.run(TorrentWorkerApplication.class, args);
    }
}
