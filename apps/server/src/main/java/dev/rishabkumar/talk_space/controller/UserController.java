package dev.rishabkumar.talk_space.controller;

import dev.rishabkumar.talk_space.dto.UserProfile;
import dev.rishabkumar.talk_space.dto.UserSummary;
import dev.rishabkumar.talk_space.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/search")
    public Flux<UserSummary> searchUsers(@RequestParam String q) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(currentUser ->
                        userRepository.findByUsernameContainingIgnoreCaseAndUsernameNot(
                                q, currentUser, PageRequest.of(0, 10))
                                .map(u -> new UserSummary(u.getId(), u.getUsername()))
                );
    }

    @GetMapping("/me")
    public Mono<UserProfile> getMe() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> userRepository.findByUsername(username)
                        .switchIfEmpty(Mono.error(
                                new ResponseStatusException(HttpStatus.NOT_FOUND))))
                .map(u -> new UserProfile(u.getId(), u.getUsername(), u.getDisplayName(), u.getAvatarColor()));
    }

    @PatchMapping("/me")
    public Mono<UserProfile> updateProfile(@RequestBody Map<String, String> body) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> userRepository.findByUsername(username)
                        .switchIfEmpty(Mono.error(
                                new ResponseStatusException(HttpStatus.NOT_FOUND))))
                .flatMap(user -> {
                    if (body.containsKey("displayName")) user.setDisplayName(body.get("displayName"));
                    if (body.containsKey("avatarColor")) user.setAvatarColor(body.get("avatarColor"));
                    return userRepository.save(user);
                })
                .map(u -> new UserProfile(u.getId(), u.getUsername(), u.getDisplayName(), u.getAvatarColor()));
    }
}
