package dev.rishabkumar.talk_space.features.user;

import dev.rishabkumar.talk_space.features.user.dto.UserProfile;
import dev.rishabkumar.talk_space.features.user.dto.UserSummary;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
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

    @PatchMapping("/me")
    public Mono<UserProfile> updateProfile(@RequestBody Map<String, Object> body) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> userService.updateProfile(username, body));
    }
}
