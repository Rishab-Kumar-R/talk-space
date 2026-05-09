package dev.rishabkumar.talk_space.features.unread;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "read_positions")
@CompoundIndex(name = "user_room", def = "{'username': 1, 'roomId': 1}", unique = true)
public class ReadPosition {

    @Id
    private String id;
    private String username;
    private String roomId;
    private Instant lastReadAt;

    public ReadPosition() {}

    public ReadPosition(String username, String roomId) {
        this.username = username;
        this.roomId = roomId;
        this.lastReadAt = Instant.now();
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getRoomId() { return roomId; }
    public Instant getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(Instant lastReadAt) { this.lastReadAt = lastReadAt; }
}
