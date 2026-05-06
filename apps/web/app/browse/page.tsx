"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicRooms } from "../../features/rooms/api";
import { PublicRoomSummary } from "../../shared/types";

export default function BrowsePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <div className="min-h-screen bg-warm-200 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-warm-900 text-2xl font-bold tracking-tight">
              Browse rooms
            </h1>
            <a
              href="/login"
              className="text-warm-600 text-sm hover:text-warm-900 transition-colors"
            >
              Sign in →
            </a>
          </div>
          <p className="text-warm-500 text-sm">
            {rooms.length} public {rooms.length === 1 ? "room" : "rooms"} available
          </p>
        </div>

        <input
          type="text"
          placeholder="Search rooms…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-warm-100 border border-warm-300 text-warm-900 rounded-xl px-4 py-2.5 text-sm mb-6 outline-none focus:border-warm-500 placeholder:text-warm-400"
        />

        {loading ? (
          <div className="text-warm-500 text-sm text-center py-16">
            Loading rooms…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-warm-500 text-sm text-center py-16">
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
    <div className="bg-warm-100 border border-warm-300 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-warm-900 font-semibold text-sm truncate">
            # {room.name}
          </h2>
          <p className="text-warm-500 text-xs mt-0.5">
            created by {room.createdBy}
          </p>
        </div>
        {room.onlineCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            {room.onlineCount} online
          </span>
        )}
      </div>

      {room.lastMessagePreview && (
        <p className="text-warm-500 text-xs line-clamp-2 leading-relaxed">
          {room.lastMessagePreview}
        </p>
      )}

      <button
        onClick={() => onJoin(room.name)}
        className="mt-auto bg-warm-800 hover:bg-warm-900 text-warm-50 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors self-start"
      >
        Join room
      </button>
    </div>
  );
}
