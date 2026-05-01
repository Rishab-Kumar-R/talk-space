package dev.rishabkumar.talk_space.controller;

import dev.rishabkumar.talk_space.model.Room;
import dev.rishabkumar.talk_space.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private final RoomRepository roomRepository;
    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public RoomController(RoomRepository roomRepository,
                          @Qualifier("reactiveStringRedisTemplate")
                          ReactiveRedisTemplate<String, String> redisTemplate) {
        this.roomRepository = roomRepository;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping
    public Flux<Room> listRooms() {
        return roomRepository.findAll();
    }

    @PostMapping
    public Mono<Room> createRoom(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name required"));
        }
        return roomRepository.existsByName(name)
                .flatMap(exists -> {
                    if (exists) return Mono.error(
                            new ResponseStatusException(HttpStatus.CONFLICT, "Room already exists"));
                    return ReactiveSecurityContextHolder.getContext()
                            .map(ctx -> (Authentication) Objects.requireNonNull(ctx.getAuthentication()))
                            .map(auth -> new Room(name, auth.getName()))
                            .flatMap(roomRepository::save);
                });
    }

    @GetMapping("/{roomId}/presence")
    public Flux<String> getPresence(@PathVariable String roomId) {
        return redisTemplate.opsForSet()
                .members("presence.room." + roomId);
    }
}
