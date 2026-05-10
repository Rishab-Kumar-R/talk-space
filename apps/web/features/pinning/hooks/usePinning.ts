"use client";

import { useState, useEffect, useCallback } from "react";
import { getPinnedMessages, pinMessage, unpinMessage } from "../api";
import { Message, Room } from "../../../shared/types";

export function usePinning(activeRoom: Room | null) {
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pendingPin, setPendingPin] = useState<Message | null>(null);

  useEffect(() => {
    setShowPinned(false);
    setPinnedMessages([]);
    setPinnedIds([]);
    if (!activeRoom) return;
    getPinnedMessages(activeRoom.name).then((msgs) => {
      setPinnedMessages(msgs);
      setPinnedIds(msgs.map((m) => m.id));
    });
  }, [activeRoom]);

  const doPin = useCallback(async (msg: Message) => {
    if (!activeRoom) return;
    await pinMessage(activeRoom.name, msg.id);
    setPinnedMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    setPinnedIds((prev) => prev.includes(msg.id) ? prev : [...prev, msg.id]);
  }, [activeRoom]);

  const handlePin = useCallback(async (msg: Message) => {
    if (pinnedIds.length >= 5) {
      setPendingPin(msg);
      return;
    }
    await doPin(msg);
  }, [pinnedIds.length, doPin]);

  const confirmPin = useCallback(async () => {
    if (!pendingPin || !activeRoom || pinnedMessages.length === 0) return;
    const oldest = pinnedMessages[0];
    await unpinMessage(activeRoom.name, oldest.id);
    setPinnedMessages((prev) => prev.filter((m) => m.id !== oldest.id));
    setPinnedIds((prev) => prev.filter((id) => id !== oldest.id));
    await doPin(pendingPin);
    setPendingPin(null);
  }, [pendingPin, activeRoom, pinnedMessages, doPin]);

  const handleUnpin = useCallback(async (messageId: string) => {
    if (!activeRoom) return;
    await unpinMessage(activeRoom.name, messageId);
    setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    setPinnedIds((prev) => prev.filter((id) => id !== messageId));
  }, [activeRoom]);

  return {
    showPinned, setShowPinned,
    pinnedMessages,
    pinnedIds,
    pendingPin, setPendingPin,
    handlePin,
    confirmPin,
    handleUnpin,
  };
}
