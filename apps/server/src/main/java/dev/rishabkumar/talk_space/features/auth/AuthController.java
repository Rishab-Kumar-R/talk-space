package dev.rishabkumar.talk_space.features.auth;

import dev.rishabkumar.talk_space.features.audit.Audited;
import dev.rishabkumar.talk_space.shared.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private static final Duration WS_TICKET_TTL = Duration.ofSeconds(30);

    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public AuthController(RefreshTokenService refreshTokenService,
                          JwtService jwtService,
                          @Qualifier("reactiveStringRedisTemplate")
                          ReactiveRedisTemplate<String, String> redisTemplate) {
        this.refreshTokenService = refreshTokenService;
        this.jwtService = jwtService;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Issues a single-use 30-second ticket for WebSocket authentication.
     * The ticket is stored in Redis and consumed on first WS connect,
     * so the JWT never appears in the WebSocket URL (and therefore never in server logs).
     */
    @PostMapping("/ws-ticket")
    public Mono<Map<String, String>> wsTicket() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    String ticket = UUID.randomUUID().toString();
                    return redisTemplate.opsForValue()
                            .set("ws:ticket:" + ticket, username, WS_TICKET_TTL)
                            .thenReturn(Map.of("ticket", ticket));
                });
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
                            log.info("Token refreshed for user={}", rt.getUsername());
                            exchange.getResponse().addCookie(buildRefreshCookie(newRt.getToken()).build());
                            return Map.of("token", jwtService.generateToken(rt.getUsername()));
                        }));
    }

    @Audited(action = "USER_LOGOUT", resourceType = "session")
    @PostMapping("/logout")
    public Mono<Void> logout(ServerWebExchange exchange) {
        exchange.getResponse().addCookie(buildRefreshCookie("").maxAge(0).build());

        // Blocklist the access token so it cannot be reused within its remaining lifetime
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        Mono<Void> blocklistJwt = (authHeader != null && authHeader.startsWith("Bearer "))
                ? jwtService.blocklist(authHeader.substring(7))
                : Mono.empty();

        HttpCookie cookie = exchange.getRequest().getCookies().getFirst("refresh_token");
        if (cookie == null) return blocklistJwt;
        log.info("User logged out, revoking refresh token");
        return blocklistJwt.then(refreshTokenService.deleteByToken(cookie.getValue()));
    }

    private ResponseCookie.ResponseCookieBuilder buildRefreshCookie(String value) {
        return ResponseCookie.from("refresh_token", value)
                .httpOnly(true)
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict");
    }
}
