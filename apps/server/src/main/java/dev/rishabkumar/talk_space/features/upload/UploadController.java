package dev.rishabkumar.talk_space.features.upload;

import dev.rishabkumar.talk_space.shared.ratelimit.RateLimitService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf", "text/plain", "application/zip",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final S3Service s3Service;
    private final RateLimitService rateLimitService;
    private final long maxBytes;
    private final int uploadsPerDay;

    public UploadController(S3Service s3Service,
                             RateLimitService rateLimitService,
                             @Value("${aws.s3.max-file-size-mb}") int maxFileSizeMb,
                             @Value("${rate-limit.uploads-per-day:20}") int uploadsPerDay) {
        this.s3Service = s3Service;
        this.rateLimitService = rateLimitService;
        this.maxBytes = (long) maxFileSizeMb * 1024 * 1024;
        this.uploadsPerDay = uploadsPerDay;
    }

    @PostMapping
    public Mono<Map<String, Object>> upload(@RequestPart("file") FilePart filePart) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    String today = LocalDate.now(ZoneOffset.UTC).toString();
                    return rateLimitService.isAllowed("ratelimit:upload:" + username + ":" + today, uploadsPerDay, 86400L)
                            .flatMap(allowed -> {
                                if (!allowed) return Mono.error(new ResponseStatusException(
                                        HttpStatus.TOO_MANY_REQUESTS,
                                        "Daily upload limit (" + uploadsPerDay + ") reached"));
                                return doUpload(filePart);
                            });
                });
    }

    private Mono<Map<String, Object>> doUpload(FilePart filePart) {
        String contentType = filePart.headers().getContentType() != null
                ? filePart.headers().getContentType().toString()
                : "application/octet-stream";

        if (!ALLOWED_TYPES.contains(contentType))
            return Mono.error(new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE, "File type not allowed: " + contentType));

        String filename = filePart.filename();
        String messageType = contentType.startsWith("image/") ? "image" : "file";

        return filePart.content()
                .map(buf -> {
                    byte[] bytes = new byte[buf.readableByteCount()];
                    buf.read(bytes);
                    return bytes;
                })
                .reduce((a, b) -> {
                    byte[] combined = new byte[a.length + b.length];
                    System.arraycopy(a, 0, combined, 0, a.length);
                    System.arraycopy(b, 0, combined, a.length, b.length);
                    return combined;
                })
                .flatMap(bytes -> {
                    if (bytes.length > maxBytes)
                        return Mono.error(new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE,
                                "File exceeds maximum size of %d MB".formatted(maxBytes / 1024 / 1024)));
                    long fileSize = bytes.length;
                    return s3Service.upload(filename, contentType, bytes)
                            .map(url -> Map.<String, Object>of(
                                    "url", url, "fileName", filename,
                                    "fileSize", fileSize, "mimeType", contentType,
                                    "messageType", messageType));
                });
    }
}
