"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "../../../shared/types";
import { getThread } from "../api";

export function useThread(roomId: string, threadReplies: Message[]) {
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [rootMessage, setRootMessage] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const openThread = useCallback((msg: Message) => {
    setRootMessage(msg);
    setOpenThreadId(msg.id);
    setThreadMessages([]);
    setLoading(true);
    getThread(roomId, msg.id).then((msgs) => {
      setThreadMessages(msgs);
      setLoading(false);
    });
  }, [roomId]);

  const closeThread = useCallback(() => {
    setOpenThreadId(null);
    setRootMessage(null);
    setThreadMessages([]);
  }, []);

  // Append live replies for the open thread
  useEffect(() => {
    if (!openThreadId) return;
    const latest = threadReplies[threadReplies.length - 1];
    if (!latest || latest.threadId !== openThreadId) return;
    setThreadMessages((prev) => {
      if (prev.some((m) => m.id === latest.id)) return prev;
      return [...prev, latest];
    });
  }, [threadReplies, openThreadId]);

  return { openThreadId, rootMessage, threadMessages, loading, openThread, closeThread };
}
