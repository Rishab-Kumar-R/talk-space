import { API_BASE, authHeaders } from "../../shared/lib/api-client";
import { Room } from "../../shared/types";

export async function getRooms(): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/rooms`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function createRoom(name: string, isPrivate = false): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, isPrivate }),
  });
  if (!res.ok) throw new Error("Could not create room");
  return res.json();
}

export async function getPresence(roomId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/presence`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function getRoomMembers(roomId: string): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/members`, { headers: authHeaders() });
  if (!res.ok) return {};
  return res.json();
}

export async function inviteMember(roomId: string, username: string): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeMember(roomId: string, username: string): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/members/${encodeURIComponent(username)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function markRoomRead(roomId: string): Promise<void> {
  await fetch(`${API_BASE}/rooms/${roomId}/read`, { method: "POST", headers: authHeaders() });
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/rooms/unread`, { headers: authHeaders() });
  if (!res.ok) return {};
  return res.json();
}
