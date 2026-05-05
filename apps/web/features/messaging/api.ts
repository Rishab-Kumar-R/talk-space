import { API_BASE, authHeaders } from "../../shared/lib/api-client";
import { Message } from "../../shared/types";

export async function getMessages(roomId: string, before?: string): Promise<Message[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages`);
  if (before) url.searchParams.set("before", before);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function searchMessages(roomId: string, q: string): Promise<Message[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages/search`);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function toggleReaction(messageId: string, emoji: string): Promise<Message> {
  const res = await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) throw new Error("Failed to toggle reaction");
  return res.json();
}

export async function editMessage(messageId: string, content: string): Promise<Message> {
  const res = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to edit message");
  return res.json();
}

export async function deleteMessage(messageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete message");
}
