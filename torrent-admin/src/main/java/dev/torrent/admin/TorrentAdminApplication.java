package dev.torrent.admin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = "dev.torrent.common.domain")
@EnableJpaRepositories(basePackages = "dev.torrent.common.repository")
public class TorrentAdminApplication {
    public static void main(String[] args) {
        SpringApplication.run(TorrentAdminApplication.class, args);
    }
}
