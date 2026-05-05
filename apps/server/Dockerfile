FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon -q
COPY src ./src
RUN ./gradlew bootJar --no-daemon -q

# Download OTel Java agent in a separate stage so it doesn't bloat the build layer
FROM alpine:3.20 AS otel
RUN apk add --no-cache curl && \
    curl -fsSL -o /otel-agent.jar \
    https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.12.0/opentelemetry-javaagent.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
COPY --from=otel /otel-agent.jar otel-agent.jar
EXPOSE 8080
# OTel agent is loaded unconditionally; set OTEL_SDK_DISABLED=true to disable it in dev
ENTRYPOINT ["java", "-javaagent:/app/otel-agent.jar", "-jar", "app.jar"]
