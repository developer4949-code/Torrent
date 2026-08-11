package dev.torrent.monolith;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"dev.torrent.api", "dev.torrent.worker", "dev.torrent.scheduler", "dev.torrent.common", "dev.torrent.admin"})
@EnableScheduling
public class TorrentMonolithApplication {

    public static void main(String[] args) {
        // Set grpc server port and client target to match so they can talk internally
        System.setProperty("grpc.server.port", "9090");
        System.setProperty("grpc.client.workerClient.address", "static://localhost:9090");
        System.setProperty("grpc.client.workerClient.negotiationType", "PLAINTEXT");
        
        SpringApplication.run(TorrentMonolithApplication.class, args);
    }
}
