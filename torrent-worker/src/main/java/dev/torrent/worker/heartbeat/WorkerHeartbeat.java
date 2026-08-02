package dev.torrent.worker.heartbeat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
public class WorkerHeartbeat {

    private static final Logger log = LoggerFactory.getLogger(WorkerHeartbeat.class);
    private final StringRedisTemplate redisTemplate;
    private final String workerId;

    public WorkerHeartbeat(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.workerId = "worker:" + UUID.randomUUID().toString();
        log.info("Initialized Worker Heartbeat for node {}", workerId);
    }

    @Scheduled(fixedRate = 5000)
    public void ping() {
        redisTemplate.opsForValue().set(workerId, "alive", 10, TimeUnit.SECONDS);
    }
}
