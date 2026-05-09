import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { NotificationPrefs } from "../../shared/types";

const BASE = `${API_BASE}/users/me/notification-prefs`;

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await apiFetch(BASE);
  if (!res.ok) return { mutedRooms: [], dndStart: null, dndEnd: null };
  return (await safeJson<NotificationPrefs>(res)) ?? { mutedRooms: [], dndStart: null, dndEnd: null };
}

export async function updateNotificationPrefs(body: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const res = await apiFetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update notification prefs");
  return (await safeJson<NotificationPrefs>(res))!;
}

export async function muteRoom(roomId: string): Promise<NotificationPrefs> {
  const res = await apiFetch(`${BASE}/mute/${encodeURIComponent(roomId)}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to mute room");
  return (await safeJson<NotificationPrefs>(res))!;
}

export async function unmuteRoom(roomId: string): Promise<NotificationPrefs> {
  const res = await apiFetch(`${BASE}/mute/${encodeURIComponent(roomId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to unmute room");
  return (await safeJson<NotificationPrefs>(res))!;
}
