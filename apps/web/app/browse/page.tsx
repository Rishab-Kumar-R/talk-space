"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hash, Search, Users, ArrowRight } from "lucide-react";
import { getPublicRooms } from "../../features/rooms/api";
import { PublicRoomSummary } from "../../shared/types";

export default function BrowsePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ts-theme") || "light";
    document.documentElement.setAttribute("data-theme", stored);
    getPublicRooms().then((data) => {
      setRooms(data);
      setLoading(false);
    });
  }, []);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleJoin(_roomName: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
    } else {
      router.push("/chat");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col px-4 py-10"
      style={{ background: "var(--bg)" }}
    >

      <div className="relative max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center text-sm font-bold"
              style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
            >
              TS
            </div>
            <div>
              <h1
                className="text-[20px] font-bold leading-tight"
                style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
              >
                Browse rooms
              </h1>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {loading ? "Loading…" : `${rooms.length} public ${rooms.length === 1 ? "room" : "rooms"} available`}
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-medium transition-all duration-150"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "var(--sh-1)",
            }}
          >
            Sign in
            <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 mb-6"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            boxShadow: "var(--sh-1)",
          }}
        >
          <Search size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search rooms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-[14px]"
            style={{ color: "var(--text)" }}
          />
        </div>

        {/* Room list */}
        {loading ? (
          <div
            className="text-[13px] text-center py-16"
            style={{ color: "var(--text-faint)" }}
          >
            Loading rooms…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-[13px] text-center py-16"
            style={{ color: "var(--text-faint)" }}
          >
            {query ? "No rooms match your search." : "No public rooms yet."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((room) => (
              <RoomCard key={room.name} room={room} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({
  room,
  onJoin,
}: {
  room: PublicRoomSummary;
  onJoin: (name: string) => void;
}) {
  return (
    <div
      className="rounded-[16px] p-4 flex flex-col gap-3 transition-all duration-150"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        boxShadow: "var(--sh-1)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-soft)" }}
          >
            <Hash size={14} style={{ color: "var(--accent)" }} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[13px] font-semibold truncate"
              style={{ color: "var(--text)" }}
            >
              {room.name}
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              by {room.createdBy}
            </p>
          </div>
        </div>

        {room.onlineCount > 0 && (
          <span
            className="flex items-center gap-1 text-[11px] shrink-0 rounded-full px-2 py-0.5"
            style={{ background: "var(--accent-emerald-soft, oklch(96% 0.03 165))", color: "var(--accent-emerald)" }}
          >
            <Users size={10} />
            {room.onlineCount}
          </span>
        )}
      </div>

      {room.lastMessagePreview && (
        <p
          className="text-[12px] leading-relaxed line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {room.lastMessagePreview}
        </p>
      )}

      <button
        onClick={() => onJoin(room.name)}
        className="mt-auto self-start rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150"
        style={{
          background: "var(--accent)",
          color: "var(--accent-fg)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        Join room
      </button>
    </div>
  );
}
