package dev.rishabkumar.talk_space.controller;

import dev.rishabkumar.talk_space.repository.MessageRepository;
import dev.rishabkumar.talk_space.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class UnreadController {

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public UnreadController(
            MessageRepository messageRepository,
            RoomRepository roomRepository,
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate) {
        this.messageRepository = messageRepository;
        this.roomRepository = roomRepository;
        this.redisTemplate = redisTemplate;
    }

    @PostMapping("/{roomId}/read")
    public Mono<Void> markRead(@PathVariable String roomId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username ->
                        redisTemplate.opsForValue().set(
                                "lastread:" + username + ":" + roomId,
                                Instant.now().toString()
                        )
                )
                .then();
    }

    @GetMapping("/unread")
    public Mono<Map<String, Long>> getUnreadCounts() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username ->
                        roomRepository.findAll()
                                .flatMap(room -> {
                                    String key = "lastread:" + username + ":" + room.getName();
                                    return redisTemplate.opsForValue().get(key)
                                            .defaultIfEmpty(Instant.EPOCH.toString())
                                            .flatMap(lastReadStr -> {
                                                Instant lastRead = Instant.parse(lastReadStr);
                                                return messageRepository
                                                        .countByRoomIdAndTimestampAfter(room.getName(), lastRead)
                                                        .map(count -> Map.entry(room.getName(), count));
                                            });
                                })
                                .collectMap(Map.Entry::getKey, Map.Entry::getValue)
                );
    }
}
