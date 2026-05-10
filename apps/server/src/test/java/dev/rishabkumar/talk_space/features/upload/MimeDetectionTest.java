package dev.rishabkumar.talk_space.features.upload;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the magic-byte MIME detection correctly identifies file types
 * regardless of what the client declares in Content-Type.
 */
class MimeDetectionTest {

    private String detect(byte[] bytes) throws Exception {
        Method m = UploadController.class.getDeclaredMethod("detectMimeType", byte[].class);
        m.setAccessible(true);
        return (String) m.invoke(null, bytes);
    }

    @Test
    void detectsJpeg() throws Exception {
        byte[] magic = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
        assertThat(detect(magic)).isEqualTo("image/jpeg");
    }

    @Test
    void detectsPng() throws Exception {
        byte[] magic = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        assertThat(detect(magic)).isEqualTo("image/png");
    }

    @Test
    void detectsGif() throws Exception {
        byte[] magic = {'G', 'I', 'F', '8', '9', 'a'};
        assertThat(detect(magic)).isEqualTo("image/gif");
    }

    @Test
    void detectsPdf() throws Exception {
        byte[] magic = {0x25, 0x50, 0x44, 0x46, 0x2D};
        assertThat(detect(magic)).isEqualTo("application/pdf");
    }

    @Test
    void detectsZipFamily() throws Exception {
        byte[] magic = {0x50, 0x4B, 0x03, 0x04};
        assertThat(detect(magic)).isEqualTo("application/zip");
    }

    @Test
    void detectsPlainText() throws Exception {
        byte[] text = "Hello, world!".getBytes();
        assertThat(detect(text)).isEqualTo("text/plain");
    }

    @Test
    void unknownBinaryFallsToOctetStream() throws Exception {
        byte[] binary = {0x00, 0x01, 0x02, 0x03};
        assertThat(detect(binary)).isEqualTo("application/octet-stream");
    }
}
