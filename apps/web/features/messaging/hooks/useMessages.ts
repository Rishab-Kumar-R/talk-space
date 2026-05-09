"use client";

import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { getMessages } from "../api";
import { Message, Room } from "../../../shared/types";
import { WsEvent } from "./useWebSocket";

export function useMessages(
  activeRoom: Room | null,
  wsMessages: Message[],
  wsEvents: WsEvent[],
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  bottomRef: React.RefObject<HTMLDivElement | null>,
  topSentinelRef: React.RefObject<HTMLDivElement | null>,
) {
  const [history, setHistory] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageOverrides, setMessageOverrides] = useState<Record<string, Message>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    if (!activeRoom) return;
    setHistory([]);
    setHasMore(true);
    setMessageOverrides({});
    getMessages(activeRoom.name).then((msgs) => {
      flushSync(() => {
        setHistory(msgs);
        setHasMore(msgs.length === 30);
      });
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    });
  }, [activeRoom, bottomRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wsMessages, bottomRef]);

  useEffect(() => {
    if (wsEvents.length === 0) return;
    const event = wsEvents[wsEvents.length - 1];
    if (event.type === "message_edited") {
      setHistory((prev) =>
        prev.map((m) => m.id === event.id
          ? { ...m, content: event.content, editedAt: event.editedAt }
          : m),
      );
      setMessageOverrides((prev) => {
        if (!prev[event.id]) return prev;
        return { ...prev, [event.id]: { ...prev[event.id], content: event.content, editedAt: event.editedAt } };
      });
    } else if (event.type === "message_deleted") {
      setHistory((prev) => prev.filter((m) => m.id !== event.id));
      setMessageOverrides((prev) => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
    } else if (event.type === "thread_count_updated") {
      setHistory((prev) =>
        prev.map((m) => m.id === event.rootId ? { ...m, threadCount: (m.threadCount ?? 0) + 1 } : m),
      );
    } else if (event.type === "reaction_updated") {
      setHistory((prev) =>
        prev.map((m) => m.id === event.id ? { ...m, reactions: event.reactions } : m),
      );
      setMessageOverrides((prev) => {
        if (!prev[event.id]) return prev;
        return { ...prev, [event.id]: { ...prev[event.id], reactions: event.reactions } };
      });
    } else if (event.type === "poll_updated") {
      setHistory((prev) =>
        prev.map((m) => m.id === event.id ? { ...m, pollVotes: event.pollVotes } : m),
      );
      setMessageOverrides((prev) => {
        if (!prev[event.id]) return prev;
        return { ...prev, [event.id]: { ...prev[event.id], pollVotes: event.pollVotes } };
      });
    }
  }, [wsEvents]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || history.length === 0 || !activeRoom) return;
    setLoadingMore(true);
    const oldest = history[0].timestamp;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const older = await getMessages(activeRoom.name, oldest);
    setHistory((prev) => [...older, ...prev]);
    setHasMore(older.length === 30);
    setLoadingMore(false);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
    });
  }, [activeRoom, history, hasMore, loadingMore, scrollContainerRef]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 1.0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const applyReaction = useCallback((messageId: string, updatedMsg: Message) => {
    setMessageOverrides((prev) => ({ ...prev, [messageId]: updatedMsg }));
  }, []);

  const revertReaction = useCallback((messageId: string) => {
    setMessageOverrides((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  }, []);

  const optimisticReaction = useCallback((messageId: string, emoji: string, username: string, allMessages: Message[]) => {
    const current = messageOverrides[messageId] ?? allMessages.find((m) => m.id === messageId);
    if (!current) return null;
    const reactions = { ...(current.reactions ?? {}) };
    const users = [...(reactions[emoji] ?? [])];
    if (users.includes(username)) {
      reactions[emoji] = users.filter((u) => u !== username);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, username];
    }
    const optimistic = { ...current, reactions };
    setMessageOverrides((prev) => ({ ...prev, [messageId]: optimistic }));
    return current;
  }, [messageOverrides]);

  const applyEdit = useCallback((messageId: string, updated: Message) => {
    setHistory((prev) => prev.map((m) => m.id === messageId ? { ...m, ...updated } : m));
    setMessageOverrides((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setHistory((prev) => prev.filter((m) => m.id !== messageId));
    setMessageOverrides((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  }, []);

  const startEdit = useCallback((msg: Message) => {
    setEditingId(msg.id);
    setEditDraft(msg.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft("");
  }, []);

  return {
    history,
    hasMore,
    loadingMore,
    messageOverrides,
    editingId,
    editDraft, setEditDraft,
    loadMore,
    applyReaction,
    revertReaction,
    optimisticReaction,
    applyEdit,
    removeMessage,
    startEdit,
    cancelEdit,
  };
}
