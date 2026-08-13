package dev.torrent.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "dev.torrent")
public class TorrentApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(TorrentApiApplication.class, args);
    }
}
