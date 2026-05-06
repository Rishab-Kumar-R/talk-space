package dev.rishabkumar.talk_space.features.auth;

import dev.rishabkumar.talk_space.shared.security.JwtService;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;

    public AuthController(RefreshTokenService refreshTokenService, JwtService jwtService) {
        this.refreshTokenService = refreshTokenService;
        this.jwtService = jwtService;
    }

    @PostMapping("/refresh")
    public Mono<Map<String, String>> refresh(ServerWebExchange exchange) {
        HttpCookie cookie = exchange.getRequest().getCookies().getFirst("refresh_token");
        if (cookie == null)
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No refresh token"));

        String oldToken = cookie.getValue();
        return refreshTokenService.validate(oldToken)
                .flatMap(rt -> refreshTokenService.rotate(oldToken, rt.getUsername())
                        .map(newRt -> {
                            exchange.getResponse().addCookie(buildRefreshCookie(newRt.getToken()));
                            return Map.of("token", jwtService.generateToken(rt.getUsername()));
                        }));
    }

    @PostMapping("/logout")
    public Mono<Void> logout(ServerWebExchange exchange) {
        exchange.getResponse().addCookie(buildRefreshCookie("").maxAge(0));
        HttpCookie cookie = exchange.getRequest().getCookies().getFirst("refresh_token");
        if (cookie == null) return Mono.empty();
        return refreshTokenService.deleteByToken(cookie.getValue());
    }

    private ResponseCookie.ResponseCookieBuilder buildRefreshCookie(String value) {
        return ResponseCookie.from("refresh_token", value)
                .httpOnly(true)
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict");
    }
}
