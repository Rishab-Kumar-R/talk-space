FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon -q
COPY src ./src
RUN ./gradlew bootJar --no-daemon -q

# Download OTel agent in isolation so curl doesn't end up in the final image
FROM alpine:3.20 AS otel
RUN apk add --no-cache curl && \
    curl -fsSL -o /otel-agent.jar \
    https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.12.0/opentelemetry-javaagent.jar

# Build a minimal custom JRE with only the modules the app needs
FROM eclipse-temurin:21-jdk-alpine AS jlink
RUN jlink \
    --add-modules java.base,java.compiler,java.desktop,java.instrument,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.security.jgss,java.security.sasl,java.sql,java.transaction.xa,java.xml,jdk.naming.dns,jdk.naming.rmi,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.management,jdk.jfr \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /jre

# Distroless base: no shell, no package manager, smallest possible attack surface
FROM gcr.io/distroless/java-base-debian12:nonroot
WORKDIR /app
COPY --from=jlink /jre /jre
COPY --from=otel /otel-agent.jar otel-agent.jar
COPY --from=build /app/build/libs/*.jar app.jar
ENV JAVA_HOME=/jre
ENV PATH=/jre/bin:$PATH
EXPOSE 8080
ENTRYPOINT ["java", "-javaagent:/app/otel-agent.jar", "-jar", "app.jar"]
