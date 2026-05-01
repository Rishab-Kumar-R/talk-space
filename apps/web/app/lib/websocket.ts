import { useEffect, useRef, useState, useCallback } from "react";
import { Message } from "./api";

export function useWebSocket(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
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
    setTypingUsers([]);

    const token = localStorage.getItem("token");
    if (!token) return;

    function connect() {
      if (destroyed.current) return;

      const ws = new WebSocket(
        `ws://localhost:8080/ws/chat/${roomId}?token=${token}`,
      );
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
    (content: string, replyToId?: string, replyPreview?: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "message", content, replyToId, replyPreview }),
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

  return { messages, typingUsers, connected, sendMessage, sendTyping };
}
