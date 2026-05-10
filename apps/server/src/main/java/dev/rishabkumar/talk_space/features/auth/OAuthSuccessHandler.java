package dev.rishabkumar.talk_space.features.auth;

import dev.rishabkumar.talk_space.features.user.User;
import dev.rishabkumar.talk_space.features.user.UserRepository;
import dev.rishabkumar.talk_space.shared.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.security.web.server.authentication.ServerAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;

@Component
public class OAuthSuccessHandler implements ServerAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuthSuccessHandler.class);

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Value("${oauth2.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public OAuthSuccessHandler(UserRepository userRepository, JwtService jwtService,
                               RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    public Mono<Void> onAuthenticationSuccess(WebFilterExchange exchange, Authentication authentication) {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = oauthToken.getPrincipal();
        String provider = oauthToken.getAuthorizedClientRegistrationId();

        String providerId = extractProviderId(oauthUser, provider);
        String username = extractUsername(oauthUser, provider);
        String displayName = extractDisplayName(oauthUser, provider);

        return userRepository.findByProviderAndProviderId(provider, providerId)
                .switchIfEmpty(createUser(provider, providerId, username, displayName))
                .flatMap(user -> {
                    log.info("OAuth login success provider={} username={}", provider, user.getUsername());
                    String jwt = jwtService.generateToken(user.getUsername());
                    return refreshTokenService.create(user.getUsername())
                            .flatMap(rt -> redirect(exchange.getExchange(), jwt, rt.getToken()));
                });
    }

    private String extractProviderId(OAuth2User oauthUser, String provider) {
        if ("google".equals(provider)) {
            return oauthUser.getAttribute("sub");
        }
        Object id = oauthUser.getAttribute("id");
        return id != null ? String.valueOf(id) : "unknown";
    }

    private String extractUsername(OAuth2User oauthUser, String provider) {
        if ("google".equals(provider)) {
            String email = oauthUser.getAttribute("email");
            return (email != null) ? email.split("@")[0] : "user";
        }
        String login = oauthUser.getAttribute("login");
        return (login != null) ? login : "user";
    }

    private String extractDisplayName(OAuth2User oauthUser, String provider) {
        String name = oauthUser.getAttribute("name");
        return (name != null && !name.isBlank()) ? name : extractUsername(oauthUser, provider);
    }

    private Mono<User> createUser(String provider, String providerId,
                                  String preferredUsername, String displayName) {
        User user = new User();
        user.setProvider(provider);
        user.setProviderId(providerId);
        user.setDisplayName(displayName);

        // Candidate list: preferred → preferred_provider → preferred_providerIdSuffix
        String suffixed = preferredUsername + "_" + provider;
        String unique = preferredUsername + "_" + providerId.substring(0, Math.min(6, providerId.length()));

        return tryUsername(user, preferredUsername)
                .switchIfEmpty(tryUsername(user, suffixed))
                .switchIfEmpty(tryUsername(user, unique))
                .doOnSuccess(u -> log.info("New OAuth user created provider={} username={}", provider, u.getUsername()));
    }

    private Mono<User> tryUsername(User user, String candidate) {
        return userRepository.findByUsername(candidate)
                .flatMap(existing -> Mono.<User>empty())
                .switchIfEmpty(Mono.defer(() -> {
                    user.setUsername(candidate);
                    return userRepository.save(user);
                }));
    }

    private Mono<Void> redirect(ServerWebExchange exchange, String jwt, String refreshToken) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FOUND);
        response.addCookie(ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict")
                .build());
        response.getHeaders().setLocation(URI.create(frontendUrl + "/auth/callback?token=" + jwt));
        return response.setComplete();
    }
}
