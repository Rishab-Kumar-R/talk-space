import { useEffect, useRef, useCallback } from "react";

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const notify = useCallback((title: string, body: string, onClick?: () => void) => {
    if (typeof Notification === "undefined") return;
    if (permissionRef.current !== "granted") return;
    if (!document.hidden) return;

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
  }, []);

  return { notify };
}
