import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { UserProfile, UserStatus, UserSummary } from "../../shared/types";

export async function searchUsers(q: string): Promise<UserSummary[]> {
  const res = await apiFetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await safeJson<UserSummary[]>(res)) ?? [];
}

export async function getUser(username: string): Promise<UserProfile | null> {
  const res = await apiFetch(`${API_BASE}/users/${encodeURIComponent(username)}`);
  if (!res.ok) return null;
  return (await safeJson<UserProfile>(res)) ?? null;
}

export async function getMyDMs(): Promise<string[]> {
  const res = await apiFetch(`${API_BASE}/users/me/dms`);
  if (!res.ok) return [];
  return (await safeJson<string[]>(res)) ?? [];
}

export async function ensureDm(partnerUsername: string): Promise<string> {
  const res = await apiFetch(`${API_BASE}/users/me/dms/${encodeURIComponent(partnerUsername)}`, { method: "POST" });
  if (!res.ok) throw new Error("Could not open DM");
  const data = await safeJson<{ roomId: string }>(res);
  return data!.roomId;
}

export async function getMe(): Promise<UserProfile | null> {
  const res = await apiFetch(`${API_BASE}/users/me`);
  if (!res.ok) return null;
  return (await safeJson<UserProfile>(res)) ?? null;
}

export async function updateProfile(
  displayName: string,
  avatarColor: string,
  showReadReceipts: boolean,
  status: UserStatus,
  statusText: string,
): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, avatarColor, showReadReceipts, status, statusText }),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return (await safeJson<UserProfile>(res))!;
}
