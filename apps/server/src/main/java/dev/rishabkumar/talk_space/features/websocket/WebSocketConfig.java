package dev.rishabkumar.talk_space.features.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.WebSocketService;
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy;
import reactor.netty.http.server.WebsocketServerSpec;

import java.util.List;
import java.util.Map;

@Configuration
public class WebSocketConfig {

    @Value("${cors.allowed-origin}")
    private String allowedOrigin;

    @Bean
    public HandlerMapping webSocketHandlerMapping(ChatWebSocketHandler handler) {
        CorsConfiguration corsConfig = new CorsConfiguration();
        corsConfig.setAllowedOrigins(List.of(allowedOrigin));
        corsConfig.setAllowedMethods(List.of("GET"));
        corsConfig.setAllowedHeaders(List.of("*"));
        corsConfig.setAllowCredentials(true);

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(Map.of("/ws/chat/**", (WebSocketHandler) handler));
        mapping.setCorsConfigurations(Map.of("/**", corsConfig));
        mapping.setOrder(-1);
        return mapping;
    }

    @Value("${chat.ws.max-frame-payload-length:65536}")
    private int maxFramePayloadLength;

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        ReactorNettyRequestUpgradeStrategy upgradeStrategy = new ReactorNettyRequestUpgradeStrategy(
                () -> WebsocketServerSpec.builder().maxFramePayloadLength(maxFramePayloadLength));
        WebSocketService wsService = new HandshakeWebSocketService(upgradeStrategy);
        return new WebSocketHandlerAdapter(wsService);
    }
}
