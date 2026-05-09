import { useEffect, useRef, useCallback } from "react";

export function useNotifications(
  isRoomMuted?: (roomId: string) => boolean,
  isDndActive?: () => boolean,
) {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => { permissionRef.current = p; });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const notify = useCallback((title: string, body: string, roomId?: string, onClick?: () => void) => {
    if (typeof Notification === "undefined") return;
    if (permissionRef.current !== "granted") return;
    if (!document.hidden) return;
    if (roomId && isRoomMuted?.(roomId)) return;
    if (isDndActive?.()) return;

    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "talkspace-message",
    });

    n.onclick = () => {
      window.focus();
      n.close();
      onClick?.();
    };
  }, [isRoomMuted, isDndActive]);

  return { notify };
}
