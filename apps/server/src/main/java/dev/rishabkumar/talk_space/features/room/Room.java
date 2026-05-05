package dev.rishabkumar.talk_space.features.room;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "rooms")
public class Room {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;
    private String createdBy;
    private Instant createdAt;
    private List<String> pinnedMessageIds = new ArrayList<>();
    private boolean isPrivate = false;
    private Map<String, String> memberRoles = new HashMap<>();

    public Room(String name, String createdBy) {
        this.name = name;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
        this.memberRoles.put(createdBy, "admin");
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<String> getPinnedMessageIds() { return pinnedMessageIds; }
    public void setPinnedMessageIds(List<String> pinnedMessageIds) { this.pinnedMessageIds = pinnedMessageIds; }
    public boolean isPrivate() { return isPrivate; }
    public void setPrivate(boolean isPrivate) { this.isPrivate = isPrivate; }
    public Map<String, String> getMemberRoles() { return memberRoles; }
    public void setMemberRoles(Map<String, String> memberRoles) { this.memberRoles = memberRoles; }
}
