package dev.rishabkumar.talk_space.features.upload;

import dev.rishabkumar.talk_space.shared.metrics.AppMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import software.amazon.awssdk.core.async.AsyncRequestBody;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
public class S3Service {

    private static final Logger log = LoggerFactory.getLogger(S3Service.class);

    private final S3AsyncClient s3;
    private final AppMetrics metrics;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.region}")
    private String region;

    public S3Service(S3AsyncClient s3, AppMetrics metrics) {
        this.s3 = s3;
        this.metrics = metrics;
    }

    public Mono<String> upload(String originalFilename, String contentType, byte[] bytes) {
        String ext = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : "";
        String key = "uploads/" + UUID.randomUUID() + ext;

        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .contentLength((long) bytes.length)
                .build();

        return Mono.fromFuture(() -> s3.putObject(req, AsyncRequestBody.fromBytes(bytes)))
                .map(resp -> "https://%s.s3.%s.amazonaws.com/%s".formatted(bucket, region, key))
                .doOnSuccess(url -> metrics.uploadBytesTotal.increment(bytes.length))
                .doOnError(e -> log.error("S3 upload failed for key {}: {}", key, e.getMessage()));
    }
}
