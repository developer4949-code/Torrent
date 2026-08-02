package dev.torrent.common.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class ClusterLogger {

    private final StringRedisTemplate redisTemplate;
    private final String nodeId;

    public ClusterLogger(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.nodeId = UUID.randomUUID().toString().substring(0, 5);
    }

    public void log(String component, String message) {
        String timestamp = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
                .withZone(ZoneId.systemDefault())
                .format(Instant.now());
        
        // Format: [12:30:45.123] [NODE-a1b2c] [KAFKA] Received job...
        String formattedLog = String.format("[%s] [NODE-%s] [%s] %s", timestamp, nodeId, component, message);
        redisTemplate.convertAndSend("cluster-logs", formattedLog);
    }
}
