"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = isRegister
        ? await register(username, password)
        : await login(username, password);
      localStorage.setItem("token", token);
      document.cookie = `token=${token}; path=/`;
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-200 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10">
          <h1 className="text-warm-900 text-3xl font-bold tracking-tight">TalkSpace</h1>
          <p className="text-warm-600 text-sm mt-1">
            {isRegister ? "Create your account" : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-warm-700 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your username"
              className="bg-warm-100 text-warm-900 border border-warm-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-warm-700 placeholder:text-warm-500 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-warm-700 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-warm-100 text-warm-900 border border-warm-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-warm-700 placeholder:text-warm-500 transition-colors"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-warm-800 text-warm-50 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-warm-900 disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? "..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-warm-600 text-sm mt-6 text-center">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-warm-800 font-medium hover:underline"
          >
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}
