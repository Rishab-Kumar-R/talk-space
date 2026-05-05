"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    localStorage.setItem("token", token);
    // Set cookie so middleware can read it server-side
    document.cookie = `token=${token}; path=/; SameSite=Lax`;
    router.replace("/chat");
  }, [params, router]);

  return (
    <div className="min-h-screen bg-warm-200 flex items-center justify-center">
      <p className="text-warm-600 text-sm">Signing you in…</p>
    </div>
  );
}
