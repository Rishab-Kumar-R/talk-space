package dev.rishabkumar.talk_space.features.user;

import dev.rishabkumar.talk_space.features.room.RoomService;
import dev.rishabkumar.talk_space.features.room.Room;
import dev.rishabkumar.talk_space.features.user.dto.UserProfile;
import dev.rishabkumar.talk_space.features.user.dto.UserSummary;
import dev.rishabkumar.talk_space.shared.ratelimit.RateLimitService;
import dev.rishabkumar.talk_space.shared.util.DmRoomUtils;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final ReactiveMongoTemplate mongoTemplate;
    private final RoomService roomService;
    private final RateLimitService rateLimitService;

    public UserController(UserService userService, ReactiveMongoTemplate mongoTemplate,
                          RoomService roomService, RateLimitService rateLimitService) {
        this.userService = userService;
        this.mongoTemplate = mongoTemplate;
        this.roomService = roomService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping("/search")
    public Flux<UserSummary> searchUsers(@RequestParam String q) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(currentUser ->
                        rateLimitService.isAllowed("ratelimit:search:" + currentUser, 30, 60)
                                .flatMapMany(allowed -> {
                                    if (!allowed) return Flux.error(new ResponseStatusException(
                                            HttpStatus.TOO_MANY_REQUESTS, "Search rate limited"));
                                    return userService.search(q, currentUser);
                                })
                );
    }

    @GetMapping("/me")
    public Mono<UserProfile> getMe() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(userService::getProfile);
    }

    @GetMapping("/{username}")
    public Mono<UserProfile> getUser(@PathVariable String username) {
        return userService.getProfile(username);
    }

    @PatchMapping("/me")
    public Mono<UserProfile> updateProfile(@RequestBody Map<String, Object> body) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> userService.updateProfile(username, body));
    }

    /**
     * Returns all DM room IDs the caller is a member of.
     * Uses ReactiveMongoTemplate so the field name can be dynamic (Spring Data @Query
     * does not support parameter substitution in key names).
     */
    @GetMapping("/me/dms")
    public Mono<List<String>> getMyDMs() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    Query q = Query.query(
                            Criteria.where("name").regex("^dm\\.")
                                    .and("memberRoles." + username).exists(true));
                    return mongoTemplate.find(q, Room.class)
                            .map(Room::getName)
                            .collectList();
                });
    }

    /**
     * Ensure a DM room exists between the caller and the target user.
     * Idempotent — safe to call multiple times.
     */
    @PostMapping("/me/dms/{partnerUsername}")
    public Mono<Map<String, String>> ensureDm(@PathVariable String partnerUsername) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    String roomId = DmRoomUtils.buildId(username, partnerUsername);
                    return roomService.ensureDmRoom(roomId, username, partnerUsername)
                            .map(room -> Map.of("roomId", room.getName()));
                });
    }
}
