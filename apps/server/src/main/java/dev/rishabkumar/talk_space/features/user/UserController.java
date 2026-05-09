package dev.rishabkumar.talk_space.features.user;

import dev.rishabkumar.talk_space.features.messaging.MessageRepository;
import dev.rishabkumar.talk_space.features.user.dto.UserProfile;
import dev.rishabkumar.talk_space.features.user.dto.UserSummary;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final ReactiveMongoTemplate mongoTemplate;

    public UserController(UserService userService, ReactiveMongoTemplate mongoTemplate) {
        this.userService = userService;
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/search")
    public Flux<UserSummary> searchUsers(@RequestParam String q) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(currentUser -> userService.search(q, currentUser));
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

    /** Returns all DM room IDs (dm.a.b) where the caller has sent or received a message. */
    @GetMapping("/me/dms")
    public Mono<List<String>> getMyDMs() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    Query q = Query.query(Criteria.where("roomId").regex("^dm\\..*" + username + ".*"));
                    return mongoTemplate.findDistinct(q, "roomId", "messages", String.class)
                            .collectList();
                });
    }
}
