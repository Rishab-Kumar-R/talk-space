export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "") + "/api";

export function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = await res.json();
  localStorage.setItem("token", data.token);
  document.cookie = `token=${data.token}; path=/; SameSite=Lax`;
  return true;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const merged: RequestInit = {
    ...init,
    credentials: "include",
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string>) },
  };
  const res = await fetch(input, merged);
  if (res.status !== 401) return res;
  const refreshed = await tryRefresh();
  if (!refreshed) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return res;
  }
  return fetch(input, {
    ...merged,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string>) },
  });
}
