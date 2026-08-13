package dev.torrent.common.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackages = "dev.torrent.common.domain")
@EnableJpaRepositories(basePackages = "dev.torrent.common.repository")
public class JpaConfig {
}
