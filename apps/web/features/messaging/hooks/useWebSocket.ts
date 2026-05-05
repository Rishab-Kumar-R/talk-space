import { useEffect, useRef, useState, useCallback } from "react";
import { Message } from "../../../shared/types";

export type WsEvent =
  | { type: "message_edited"; id: string; content: string; editedAt: string }
  | { type: "message_deleted"; id: string };

export function useWebSocket(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyed = useRef(false);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    destroyed.current = false;
    retryCount.current = 0;
    setMessages([]);
    setWsEvents([]);
    setTypingUsers([]);

    const token = localStorage.getItem("token");
    if (!token) return;

    function connect() {
      if (destroyed.current) return;

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const wsBase = apiBase.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/ws/chat/${roomId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount.current = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "typing") {
          const { username } = data as { username: string };
          setTypingUsers((prev) =>
            prev.includes(username) ? prev : [...prev, username],
          );
          if (typingTimers.current[username]) {
            clearTimeout(typingTimers.current[username]);
          }
          typingTimers.current[username] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== username));
            delete typingTimers.current[username];
          }, 2500);
        } else if (data.type === "message") {
          const { type: _type, ...message } = data;
          setMessages((prev) => [...prev, message as Message]);
        } else if (data.type === "message_edited" || data.type === "message_deleted") {
          setWsEvents((prev) => [...prev, data as WsEvent]);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (destroyed.current) return;
        const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
        retryCount.current += 1;
        retryTimer.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      destroyed.current = true;
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
      filePayload?: { fileUrl: string; fileName: string; fileSize: number; mimeType: string; messageType: "image" | "file" },
    ) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "message", content, replyToId, replyPreview, ...filePayload }),
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

  return { messages, wsEvents, typingUsers, connected, sendMessage, sendTyping };
}
