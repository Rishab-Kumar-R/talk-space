import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { UploadResult } from "../../shared/types";

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(`${API_BASE}/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Upload failed");
    throw new Error(text);
  }
  return safeJson<UploadResult>(res);
}
