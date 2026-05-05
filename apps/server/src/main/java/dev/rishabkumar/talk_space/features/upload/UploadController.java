package dev.rishabkumar.talk_space.features.upload;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

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
    private final long maxBytes;

    public UploadController(S3Service s3Service, @Value("${aws.s3.max-file-size-mb}") int maxFileSizeMb) {
        this.s3Service = s3Service;
        this.maxBytes = (long) maxFileSizeMb * 1024 * 1024;
    }

    @PostMapping
    public Mono<Map<String, Object>> upload(@RequestPart("file") FilePart filePart) {
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
                        return Mono.error(new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
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
