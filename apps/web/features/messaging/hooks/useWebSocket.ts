import { useEffect, useRef, useState, useCallback } from "react";
import { Message } from "../../../shared/types";

export type WsEvent =
  | { type: "message_edited"; id: string; content: string; editedAt: string }
  | { type: "message_deleted"; id: string }
  | { type: "thread_count_updated"; rootId: string }
  | { type: "reaction_updated"; id: string; reactions: Record<string, string[]> }
  | { type: "unread_bump"; roomId: string }
  | { type: "poll_updated"; id: string; pollVotes: Record<string, number> }
  | { type: "room_removed"; roomId: string };

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function fetchWsTicket(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase}/api/auth/ws-ticket`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { ticket } = await res.json();
    return ticket as string;
  } catch {
    return null;
  }
}

export function useWebSocket(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([]);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [threadTypingUsers, setThreadTypingUsers] = useState<Record<string, string[]>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const gen = genRef.current;
    retryCount.current = 0;
    setMessages([]);
    setWsEvents([]);
    setTypingUsers([]);
    setThreadReplies([]);

    if (!roomId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    async function connect() {
      if (genRef.current !== gen) return;

      // Fetch a short-lived single-use ticket so the JWT never appears in the WS URL
      const ticket = await fetchWsTicket(token!);
      if (genRef.current !== gen) return;
      if (!ticket) {
        // Ticket fetch failed (auth error, network blip) — retry with backoff
        const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
        retryCount.current += 1;
        retryTimer.current = setTimeout(connect, delay);
        return;
      }

      const wsBase = apiBase.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/ws/chat/${roomId}?ticket=${ticket}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount.current = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (genRef.current !== gen) return;
        const data = JSON.parse(event.data);

        if (data.type === "typing") {
          const { username, threadId } = data as { username: string; threadId?: string };
          const timerKey = threadId ? `thread:${threadId}:${username}` : username;

          if (threadId) {
            setThreadTypingUsers((prev) => {
              const current = prev[threadId] ?? [];
              if (current.includes(username)) return prev;
              return { ...prev, [threadId]: [...current, username] };
            });
          } else {
            setTypingUsers((prev) =>
              prev.includes(username) ? prev : [...prev, username],
            );
          }

          if (typingTimers.current[timerKey]) {
            clearTimeout(typingTimers.current[timerKey]);
          }
          typingTimers.current[timerKey] = setTimeout(() => {
            if (threadId) {
              setThreadTypingUsers((prev) => {
                const filtered = (prev[threadId] ?? []).filter((u) => u !== username);
                return { ...prev, [threadId]: filtered };
              });
            } else {
              setTypingUsers((prev) => prev.filter((u) => u !== username));
            }
            delete typingTimers.current[timerKey];
          }, 2500);
        } else if (data.type === "message") {
          const { type: _type, ...message } = data;
          setMessages((prev) => [...prev, message as Message]);
        } else if (data.type === "thread_reply") {
          const { type: _type, ...message } = data;
          setThreadReplies((prev) => [...prev, message as Message]);
        } else if (
          data.type === "message_edited" || data.type === "message_deleted" ||
          data.type === "thread_count_updated" || data.type === "reaction_updated" ||
          data.type === "unread_bump" || data.type === "poll_updated" ||
          data.type === "room_removed"
        ) {
          setWsEvents((prev) => [...prev, data as WsEvent]);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (genRef.current !== gen) return;
        const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
        retryCount.current += 1;
        retryTimer.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      genRef.current++;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
      wsRef.current?.close();
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (
      content: string,
      replyToId?: string,
      replyPreview?: string,
      extraPayload?: Record<string, unknown>,
      threadId?: string,
    ) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "message", content, replyToId, replyPreview, threadId, ...extraPayload }),
        );
      }
    },
    [],
  );

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing" }));
    }
  }, []);

  const sendThreadTyping = useCallback((threadId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", threadId }));
    }
  }, []);

  return { messages, wsEvents, threadReplies, typingUsers, threadTypingUsers, connected, sendMessage, sendTyping, sendThreadTyping };
}
