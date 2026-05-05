package dev.rishabkumar.talk_space.features.auth;

import dev.rishabkumar.talk_space.features.auth.dto.AuthRequest;
import dev.rishabkumar.talk_space.features.auth.dto.AuthResponse;
import dev.rishabkumar.talk_space.features.user.User;
import dev.rishabkumar.talk_space.features.user.UserRepository;
import dev.rishabkumar.talk_space.shared.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public Mono<AuthResponse> register(AuthRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .flatMap(existing -> Mono.<AuthResponse>error(new RuntimeException("Username already taken")))
                .switchIfEmpty(Mono.defer(() -> {
                    User user = new User(request.getUsername(), passwordEncoder.encode(request.getPassword()));
                    return userRepository.save(user)
                            .map(saved -> new AuthResponse(jwtService.generateToken(saved.getUsername())));
                }));
    }

    public Mono<AuthResponse> login(AuthRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .switchIfEmpty(Mono.error(new RuntimeException("User not found")))
                .flatMap(user -> {
                    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                        return Mono.error(new RuntimeException("Invalid username or password"));
                    }
                    return Mono.just(new AuthResponse(jwtService.generateToken(user.getUsername())));
                });
    }
}
