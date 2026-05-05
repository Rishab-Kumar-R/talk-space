package dev.rishabkumar.talk_space.features.user.dto;

public record UserProfile(
        String id,
        String username,
        String displayName,
        String avatarColor,
        boolean showReadReceipts,
        String status,
        String statusText
) {}
