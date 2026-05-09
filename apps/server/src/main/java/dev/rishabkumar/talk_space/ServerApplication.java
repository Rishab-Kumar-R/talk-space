package dev.rishabkumar.talk_space;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

@SpringBootApplication
@EnableScheduling
public class ServerApplication {

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(ServerApplication.class, args);
    }

    private static void loadDotEnv() {
        Path envPath = Path.of(".env");
        if (!Files.exists(envPath)) {
            return;
        }

        try (Stream<String> lines = Files.lines(envPath)) {
            lines.map(String::trim)
                    .filter(line -> !line.isBlank() && !line.startsWith("#") && line.contains("="))
                    .forEach(line -> {
                        int idx = line.indexOf('=');
                        String key = line.substring(0, idx).trim();
                        String value = line.substring(idx + 1).trim().replaceAll("^\"|\"$", "");
                        System.setProperty(key, value);

                        if ("MONGODB_URI".equals(key)) {
                            System.setProperty("spring.mongodb.uri", value);
                        } else if ("REDIS_HOST".equals(key)) {
                            System.setProperty("spring.data.redis.host", value);
                        } else if ("REDIS_PORT".equals(key)) {
                            System.setProperty("spring.data.redis.port", value);
                        } else if ("REDIS_PASSWORD".equals(key)) {
                            System.setProperty("spring.data.redis.password", value);
                        } else if ("REDIS_SSL_ENABLED".equals(key)) {
                            System.setProperty("spring.data.redis.ssl.enabled", value);
                        }
                    });
        } catch (IOException ignored) {
            // If .env cannot be read, fall back to whatever the runtime environment provides.
        }
    }

}
