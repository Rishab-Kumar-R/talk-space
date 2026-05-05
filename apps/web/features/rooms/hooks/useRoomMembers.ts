"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getRoomMembers, inviteMember, removeMember } from "../api";
import { Room } from "../../../shared/types";
import { isDM } from "../../../shared/lib/utils";

export function useRoomMembers(activeRoom: Room | null, username: string) {
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomMembers, setRoomMembers] = useState<Record<string, string>>({});
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    setShowRoomSettings(false);
    setRoomMembers({});
    if (!activeRoom || isDM(activeRoom.name)) return;
    getRoomMembers(activeRoom.name).then(setRoomMembers);
  }, [activeRoom]);

  const handleInvite = useCallback(async (e: React.FormEvent, onRoomUpdate: (r: Room) => void) => {
    e.preventDefault();
    if (!activeRoom || !inviteUsername.trim()) return;
    setInviteError("");
    setInviting(true);
    try {
      const updated = await inviteMember(activeRoom.name, inviteUsername.trim());
      setRoomMembers(updated.memberRoles ?? {});
      onRoomUpdate(updated);
      setInviteUsername("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }, [activeRoom, inviteUsername]);

  const handleKickMember = useCallback(async (
    targetUsername: string,
    onRoomUpdate: (r: Room) => void,
    onLeave: () => void,
  ) => {
    if (!activeRoom) return;
    try {
      const updated = await removeMember(activeRoom.name, targetUsername);
      setRoomMembers(updated.memberRoles ?? {});
      onRoomUpdate(updated);
      if (targetUsername === username) {
        onLeave();
        setShowRoomSettings(false);
      }
    } catch (err) {
      console.error("Kick failed:", err);
    }
  }, [activeRoom, username]);

  return {
    showRoomSettings, setShowRoomSettings,
    roomMembers, setRoomMembers,
    inviteUsername, setInviteUsername,
    inviteError, setInviteError,
    inviting,
    handleInvite,
    handleKickMember,
  };
}
