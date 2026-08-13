package dev.torrent.worker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "dev.torrent")
@EnableScheduling
public class TorrentWorkerApplication {
    public static void main(String[] args) {
        SpringApplication.run(TorrentWorkerApplication.class, args);
    }
}
