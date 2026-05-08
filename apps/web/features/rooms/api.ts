import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { PublicRoomSummary, Room } from "../../shared/types";

export async function getPublicRooms(): Promise<PublicRoomSummary[]> {
  const res = await fetch(`${API_BASE}/rooms/public`);
  if (!res.ok) return [];
  return (await safeJson<PublicRoomSummary[]>(res)) ?? [];
}

export async function getRooms(): Promise<Room[]> {
  const res = await apiFetch(`${API_BASE}/rooms`);
  if (!res.ok) return [];
  return (await safeJson<Room[]>(res)) ?? [];
}

export async function createRoom(name: string, isPrivate = false): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, isPrivate }),
  });
  if (!res.ok) throw new Error("Could not create room");
  return (await safeJson<Room>(res))!;
}

export async function getPresence(roomId: string): Promise<string[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/presence`);
  if (!res.ok) return [];
  return (await safeJson<string[]>(res)) ?? [];
}

export async function getGlobalPresence(): Promise<string[]> {
  const res = await apiFetch(`${API_BASE}/rooms/presence/online`);
  if (!res.ok) return [];
  return (await safeJson<string[]>(res)) ?? [];
}

export async function getRoomMembers(roomId: string): Promise<Record<string, string>> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/members`);
  if (!res.ok) return {};
  return (await safeJson<Record<string, string>>(res)) ?? {};
}

export async function inviteMember(roomId: string, username: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await safeJson<Room>(res))!;
}

export async function removeMember(roomId: string, username: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/members/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await safeJson<Room>(res))!;
}

export async function updateRoomDescription(roomId: string, description: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await safeJson<Room>(res))!;
}

export async function markRoomRead(roomId: string): Promise<void> {
  await apiFetch(`${API_BASE}/rooms/${roomId}/read`, { method: "POST" });
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const res = await apiFetch(`${API_BASE}/rooms/unread`);
  if (!res.ok) return {};
  return (await safeJson<Record<string, number>>(res)) ?? {};
}
