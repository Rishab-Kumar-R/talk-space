"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getRooms, createRoom, markRoomRead, getUnreadCounts } from "../api";
import { Room } from "../../../shared/types";

export function useRooms(initialRoomName?: string) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({});
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    getRooms().then((r) => {
      setRooms(r);
      const target = initialRoomName ? r.find((room) => room.name === initialRoomName) : null;
      setActiveRoom(target ?? (r.length > 0 ? r[0] : null));
    });
    getUnreadCounts().then(setUnreadCounts);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectRoom = useCallback((room: Room) => {
    setActiveRoom(room);
    setUnreadCounts((prev) => ({ ...prev, [room.name]: 0 }));
    setMentionCounts((prev) => ({ ...prev, [room.name]: 0 }));
    markRoomRead(room.name);
  }, []);

  const handleCreateRoom = useCallback(async (e: React.FormEvent, onSuccess?: (room: Room) => void) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreateError("");
    try {
      const room = await createRoom(newRoomName.trim(), newRoomPrivate);
      setRooms((prev) => [...prev, room]);
      setNewRoomName("");
      setNewRoomPrivate(false);
      setShowCreateRoom(false);
      selectRoom(room);
      onSuccess?.(room);
    } catch {
      setCreateError("Room already exists or name is invalid");
    }
  }, [newRoomName, newRoomPrivate, selectRoom]);

  const removeRoom = useCallback((roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const updateRoom = useCallback((updated: Room) => {
    setRooms((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  }, []);

  return {
    rooms, setRooms,
    activeRoom, setActiveRoom, selectRoom,
    unreadCounts, setUnreadCounts,
    mentionCounts, setMentionCounts,
    newRoomName, setNewRoomName,
    newRoomPrivate, setNewRoomPrivate,
    showCreateRoom, setShowCreateRoom,
    createError, setCreateError,
    handleCreateRoom,
    removeRoom, updateRoom,
  };
}
