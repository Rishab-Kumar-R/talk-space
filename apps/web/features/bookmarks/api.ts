import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { Bookmark } from "./hooks/useBookmarks";
import { Message, Room } from "../../shared/types";

export async function fetchBookmarks(): Promise<Bookmark[]> {
  const res = await apiFetch(`${API_BASE}/bookmarks`);
  if (!res.ok) return [];
  return (await safeJson<Bookmark[]>(res)) ?? [];
}

export async function addBookmark(msg: Message, room: Room | null): Promise<Bookmark | null> {
  const res = await apiFetch(`${API_BASE}/bookmarks/${msg.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: msg.roomId,
      roomName: room?.name ?? msg.roomId,
      content: msg.content,
      senderUsername: msg.senderUsername,
      timestamp: msg.timestamp,
      messageType: msg.messageType ?? "text",
      fileUrl: msg.fileUrl ?? null,
      fileName: msg.fileName ?? null,
    }),
  });
  if (!res.ok) return null;
  return (await safeJson<Bookmark>(res)) ?? null;
}

export async function removeBookmark(messageId: string): Promise<void> {
  await apiFetch(`${API_BASE}/bookmarks/${messageId}`, { method: "DELETE" });
}
