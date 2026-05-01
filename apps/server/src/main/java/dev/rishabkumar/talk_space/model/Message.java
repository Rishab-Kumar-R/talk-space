package dev.rishabkumar.talk_space.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "messages")
public class Message {
    @Id
    private String id;

    @Indexed
    private String roomId;

    private String senderId;
    private String senderUsername;
    private String content;
    private Instant timestamp = Instant.now();
    private String replyToId;
    private String replyPreview;
    private Map<String, List<String>> reactions = new HashMap<>();

    public Message() {}

    public Message(String roomId, String senderId, String senderUsername, String content) {
        this.roomId = roomId;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.content = content;
    }

    public String getId() { return id; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public String getReplyToId() { return replyToId; }
    public void setReplyToId(String replyToId) { this.replyToId = replyToId; }
    public String getReplyPreview() { return replyPreview; }
    public void setReplyPreview(String replyPreview) { this.replyPreview = replyPreview; }
    public Map<String, List<String>> getReactions() { return reactions; }
    public void setReactions(Map<String, List<String>> reactions) { this.reactions = reactions; }
}
