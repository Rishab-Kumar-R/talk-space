plugins {
    java
    id("org.springframework.boot") version "4.0.6"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "dev.rishabkumar.talk_space"
version = "0.0.1-SNAPSHOT"
description = "server"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
    maven { url = uri("https://repo.spring.io/release") }
    maven { url = uri("https://repo.spring.io/milestone") }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb-reactive")
    implementation("org.springframework.boot:spring-boot-starter-data-redis-reactive")
    implementation("org.springframework.boot:spring-boot-starter-webflux")

    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")

    implementation(platform("software.amazon.awssdk:bom:2.31.14"))
    implementation("software.amazon.awssdk:s3")
    implementation("software.amazon.awssdk:netty-nio-client")

    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("com.github.loki4j:loki-logback-appender:1.5.2")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    jvmArgs("-Djdk.tls.client.protocols=TLSv1.2,TLSv1.3", "-Djsse.enableSNIExtension=true")
    val envFile = projectDir.resolve(".env")
    if (envFile.exists()) {
        val props = envFile.readLines()
            .filter { it.isNotBlank() && !it.startsWith("#") && it.contains("=") }
            .associate { line ->
                val idx = line.indexOf("=")
                line.substring(0, idx).trim() to line.substring(idx + 1).trim().removeSurrounding("\"")
            }

        props.forEach { (key, value) ->
            environment(key, value)
        }

        props["MONGODB_URI"]?.let { value ->
            environment("SPRING_MONGODB_URI", value)
            systemProperty("spring.mongodb.uri", value)
            args("--spring.mongodb.uri=$value")
        }
        props["REDIS_HOST"]?.let { value ->
            environment("SPRING_DATA_REDIS_HOST", value)
            systemProperty("spring.data.redis.host", value)
            args("--spring.data.redis.host=$value")
        }
        props["REDIS_PORT"]?.let { value ->
            environment("SPRING_DATA_REDIS_PORT", value)
            systemProperty("spring.data.redis.port", value)
            args("--spring.data.redis.port=$value")
        }
        props["REDIS_PASSWORD"]?.let { value ->
            environment("SPRING_DATA_REDIS_PASSWORD", value)
            systemProperty("spring.data.redis.password", value)
            args("--spring.data.redis.password=$value")
        }
        props["REDIS_SSL_ENABLED"]?.let { value ->
            environment("SPRING_DATA_REDIS_SSL_ENABLED", value)
            systemProperty("spring.data.redis.ssl.enabled", value)
            args("--spring.data.redis.ssl.enabled=$value")
        }
    }
}
