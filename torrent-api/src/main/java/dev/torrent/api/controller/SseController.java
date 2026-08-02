package dev.torrent.api.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/stream")
@CrossOrigin(origins = "*")
public class SseController implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(SseController.class);
    
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final RedisTemplate<String, String> redisTemplate;

    public SseController(RedisMessageListenerContainer redisContainer, RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        redisContainer.addMessageListener(this, new ChannelTopic("cluster-logs"));
    }

    @GetMapping(value = "/logs", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs() {
        SseEmitter emitter = new SseEmitter(3600000L); // 1 hour timeout
        this.emitters.add(emitter);

        emitter.onCompletion(() -> this.emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            this.emitters.remove(emitter);
        });
        emitter.onError((e) -> this.emitters.remove(emitter));

        return emitter;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String logMessage = redisTemplate.getStringSerializer().deserialize(message.getBody());
        if (logMessage != null) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("log").data(logMessage));
                } catch (IOException e) {
                    emitters.remove(emitter);
                }
            }
        }
    }
}
