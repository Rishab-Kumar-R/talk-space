package dev.rishabkumar.talk_space.features.room;

public record PublicRoomSummary(
        String name,
        String createdBy,
        String createdAt,
        long onlineCount,
        String lastMessagePreview,
        String lastMessageAt
) {}
