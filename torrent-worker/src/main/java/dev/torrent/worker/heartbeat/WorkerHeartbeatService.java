package dev.torrent.worker.heartbeat;

import dev.torrent.common.domain.Worker;
import dev.torrent.common.repository.WorkerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.concurrent.TimeUnit;

@Service
public class WorkerHeartbeatService {

    private final WorkerRepository workerRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${torrent.worker.id}")
    private String workerId;

    public WorkerHeartbeatService(WorkerRepository workerRepository, StringRedisTemplate redisTemplate) {
        this.workerRepository = workerRepository;
        this.redisTemplate = redisTemplate;
    }

    @PostConstruct
    public void registerWorker() {
        Worker worker = new Worker();
        worker.setWorkerId(workerId);
        try {
            worker.setHostname(InetAddress.getLocalHost().getHostName());
        } catch (UnknownHostException e) {
            worker.setHostname("unknown");
        }
        workerRepository.save(worker);
    }

    @Scheduled(fixedRateString = "${torrent.worker.heartbeat-interval-ms}")
    public void sendHeartbeat() {
        String key = "worker:" + workerId + ":heartbeat";
        redisTemplate.opsForValue().set(key, "ALIVE", 15, TimeUnit.SECONDS);
    }
}
