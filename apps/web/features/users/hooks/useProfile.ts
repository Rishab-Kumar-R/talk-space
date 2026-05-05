"use client";

import { useState, useCallback } from "react";
import { getMe, updateProfile } from "../api";
import { UserProfile, UserStatus } from "../../../shared/types";
import { PROFILE_COLORS } from "../../../shared/lib/utils";

export function useProfile() {
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState(PROFILE_COLORS[0]);
  const [editShowReceipts, setEditShowReceipts] = useState(true);
  const [editStatus, setEditStatus] = useState<UserStatus>("available");
  const [editStatusText, setEditStatusText] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    const profile = await getMe();
    if (profile) {
      setMyProfile(profile);
      setEditDisplayName(profile.displayName ?? "");
      setEditAvatarColor(profile.avatarColor ?? PROFILE_COLORS[0]);
      setEditShowReceipts(profile.showReadReceipts ?? true);
      setEditStatus(profile.status ?? "available");
      setEditStatusText(profile.statusText ?? "");
    }
  }, []);

  const openProfile = useCallback(() => {
    setEditDisplayName(myProfile?.displayName ?? "");
    setEditAvatarColor(myProfile?.avatarColor ?? PROFILE_COLORS[0]);
    setEditShowReceipts(myProfile?.showReadReceipts ?? true);
    setEditStatus(myProfile?.status ?? "available");
    setEditStatusText(myProfile?.statusText ?? "");
    setShowProfile(true);
  }, [myProfile]);

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile(editDisplayName, editAvatarColor, editShowReceipts, editStatus, editStatusText);
      setMyProfile(updated);
      setShowProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }, [editDisplayName, editAvatarColor, editShowReceipts, editStatus, editStatusText]);

  return {
    myProfile,
    showProfile, setShowProfile,
    editDisplayName, setEditDisplayName,
    editAvatarColor, setEditAvatarColor,
    editShowReceipts, setEditShowReceipts,
    editStatus, setEditStatus,
    editStatusText, setEditStatusText,
    savingProfile,
    loadProfile,
    openProfile,
    saveProfile,
  };
}
