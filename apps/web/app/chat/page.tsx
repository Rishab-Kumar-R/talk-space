"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getMessages, getRooms, createRoom, getPresence, toggleReaction, searchUsers,
  getMe, updateProfile, markRoomRead, getUnreadCounts,
  Message, Room, UserSummary, UserProfile,
} from "../lib/api";
import { useWebSocket } from "../lib/websocket";

const AVATAR_COLORS = [
  "#c4a882", "#82b4a4", "#a49ac4", "#c4827a", "#8aa4c4",
  "#b4a882", "#82c4a0", "#c482b4", "#a4c482", "#9490c4",
];
const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function avatarBg(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const PROFILE_COLORS = [
  "#c4a882", "#82b4a4", "#a49ac4", "#c4827a", "#8aa4c4",
  "#b4a882", "#82c4a0", "#c482b4", "#e07b54", "#54a0e0",
];

function Avatar({ name, size = 38, color }: { name: string; size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color ?? avatarBg(name), flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700, color: "white",
        userSelect: "none", letterSpacing: "-0.5px",
      }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function typingText(users: string[], self: string): string {
  const others = users.filter((u) => u !== self);
  if (others.length === 0) return "";
  if (others.length === 1) return `${others[0]} is typing...`;
  if (others.length === 2) return `${others[0]} and ${others[1]} are typing...`;
  if (others.length <= 4)
    return `${others.slice(0, -1).join(", ")} and ${others[others.length - 1]} are typing...`;
  return `${others[0]}, ${others[1]} and ${others.length - 2} others are typing...`;
}

function isDM(name: string) {
  return name.startsWith("dm.");
}

function dmPartner(roomId: string, self: string): string {
  return roomId.replace("dm.", "").split(".").find((p) => p !== self) ?? roomId;
}

function buildDMRoomId(a: string, b: string): string {
  return `dm.${[a, b].sort().join(".")}`;
}

interface ReplyTo {
  id: string;
  username: string;
  preview: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [mobileView, setMobileView] = useState<"rooms" | "chat">("rooms");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [username, setUsername] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [createError, setCreateError] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [messageOverrides, setMessageOverrides] = useState<Record<string, Message>>({});

  // Profile state
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Unread state
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // DM state
  const [activeDMs, setActiveDMs] = useState<string[]>([]);
  const [showDMSearch, setShowDMSearch] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [dmResults, setDmResults] = useState<UserSummary[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const dmSearchRef = useRef<HTMLInputElement>(null);

  const typingThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, typingUsers, connected, sendMessage, sendTyping } =
    useWebSocket(activeRoom?.name ?? "");

  // Load user + profile + restore DMs from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUsername(payload.sub);
    try {
      const saved = JSON.parse(localStorage.getItem("talkspace_dms") ?? "[]");
      setActiveDMs(saved);
    } catch { /* ignore */ }
    getMe().then((profile) => {
      if (profile) {
        setMyProfile(profile);
        setEditDisplayName(profile.displayName ?? "");
        setEditAvatarColor(profile.avatarColor ?? PROFILE_COLORS[0]);
      }
    });
    getUnreadCounts().then(setUnreadCounts);
  }, [router]);

  useEffect(() => {
    getRooms().then((r) => {
      setRooms(r);
      if (r.length > 0) setActiveRoom(r[0]);
    });
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    setHistory([]);
    setHasMore(true);
    setMessageOverrides({});
    getMessages(activeRoom.name).then((msgs) => {
      setHistory(msgs);
      setHasMore(msgs.length === 30);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 0);
    });
  }, [activeRoom]);

  useEffect(() => {
    if (!activeRoom || isDM(activeRoom.name)) return;
    const poll = () => getPresence(activeRoom.name).then(setOnlineUsers);
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showCreateRoom) setTimeout(() => createInputRef.current?.focus(), 50);
  }, [showCreateRoom]);

  useEffect(() => {
    if (showDMSearch) setTimeout(() => dmSearchRef.current?.focus(), 50);
  }, [showDMSearch]);

  // DM user search (debounced)
  useEffect(() => {
    if (!dmQuery.trim()) { setDmResults([]); return; }
    const t = setTimeout(() => {
      searchUsers(dmQuery).then(setDmResults);
    }, 300);
    return () => clearTimeout(t);
  }, [dmQuery]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerFor) return;
    const handler = () => setEmojiPickerFor(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [emojiPickerFor]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || history.length === 0 || !activeRoom) return;
    setLoadingMore(true);
    const oldest = history[0].timestamp;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const older = await getMessages(activeRoom.name, oldest);
    setHistory((prev) => [...older, ...prev]);
    setHasMore(older.length === 30);
    setLoadingMore(false);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
    });
  }, [activeRoom, history, hasMore, loadingMore]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 1.0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreateError("");
    try {
      const room = await createRoom(newRoomName.trim());
      setRooms((prev) => [...prev, room]);
      setNewRoomName("");
      setShowCreateRoom(false);
      handleRoomSelect(room);
    } catch {
      setCreateError("Room already exists");
    }
  }

  function handleRoomSelect(room: Room) {
    setActiveRoom(room);
    setMobileView("chat");
    setReplyTo(null);
    setEmojiPickerFor(null);
    setOnlineUsers([]);
    setUnreadCounts((prev) => ({ ...prev, [room.name]: 0 }));
    markRoomRead(room.name);
  }

  function startDM(targetUsername: string) {
    const roomId = buildDMRoomId(username, targetUsername);
    const updated = activeDMs.includes(roomId)
      ? activeDMs
      : [...activeDMs, roomId];
    setActiveDMs(updated);
    localStorage.setItem("talkspace_dms", JSON.stringify(updated));

    const virtualRoom: Room = { id: roomId, name: roomId, createdBy: "", createdAt: "" };
    handleRoomSelect(virtualRoom);
    setShowDMSearch(false);
    setDmQuery("");
    setDmResults([]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (!typingThrottle.current) {
      sendTyping();
      typingThrottle.current = setTimeout(() => {
        typingThrottle.current = null;
      }, 1000);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(
      input.trim(),
      replyTo?.id,
      replyTo ? `${replyTo.username}: ${replyTo.preview}` : undefined,
    );
    setInput("");
    setReplyTo(null);
  }

  function handleReply(msg: Message) {
    setReplyTo({ id: msg.id, username: msg.senderUsername, preview: msg.content });
    setEmojiPickerFor(null);
  }

  async function handleReaction(messageId: string, emoji: string) {
    const allMsgs = [...history, ...messages];
    const current = messageOverrides[messageId] ?? allMsgs.find((m) => m.id === messageId);
    if (!current) return;

    const reactions = { ...(current.reactions ?? {}) };
    const users = [...(reactions[emoji] ?? [])];
    if (users.includes(username)) {
      reactions[emoji] = users.filter((u) => u !== username);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, username];
    }
    setMessageOverrides((prev) => ({ ...prev, [messageId]: { ...current, reactions } }));

    try {
      const updated = await toggleReaction(messageId, emoji);
      setMessageOverrides((prev) => ({ ...prev, [messageId]: updated }));
    } catch {
      setMessageOverrides((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateProfile(editDisplayName, editAvatarColor);
      setMyProfile(updated);
      setShowProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("talkspace_dms");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  const seen = new Set<string>();
  const allMessages = [...history, ...messages].filter((msg) => {
    if (!msg.id || seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });

  const typingLine = typingText(typingUsers, username);
  const currentIsDM = activeRoom ? isDM(activeRoom.name) : false;
  const headerTitle = activeRoom
    ? currentIsDM
      ? dmPartner(activeRoom.name, username)
      : `# ${activeRoom.name}`
    : "";

  return (
    <div className="h-screen flex overflow-hidden bg-warm-200">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`
          ${mobileView === "chat" ? "hidden" : "flex"} md:flex
          flex-col w-full md:w-64 shrink-0
          bg-warm-300 border-r border-warm-400
        `}
      >
        <div className="px-5 py-5 border-b border-warm-400">
          <span className="text-warm-900 text-lg font-bold tracking-tight">TalkSpace</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {/* Rooms */}
          <p className="text-warm-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
            Rooms
          </p>
          {rooms.map((room) => {
            const unread = unreadCounts[room.name] ?? 0;
            return (
              <button
                key={room.id}
                onClick={() => handleRoomSelect(room)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 mb-0.5
                  ${activeRoom?.id === room.id
                    ? "bg-warm-400 text-warm-900 font-semibold"
                    : "text-warm-700 hover:bg-warm-200 hover:text-warm-900"}
                `}
              >
                <span className="text-warm-500">#</span>
                <span className="flex-1 truncate">{room.name}</span>
                {unread > 0 && activeRoom?.id !== room.id && (
                  <span className="bg-warm-800 text-warm-50 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-1">
            {showCreateRoom ? (
              <form onSubmit={handleCreateRoom} className="px-1">
                <input
                  ref={createInputRef}
                  value={newRoomName}
                  onChange={(e) => { setNewRoomName(e.target.value); setCreateError(""); }}
                  placeholder="room-name"
                  className="w-full bg-warm-100 border border-warm-400 rounded-lg px-3 py-2 text-sm text-warm-900 outline-none focus:border-warm-700 placeholder:text-warm-500 mb-1.5"
                />
                {createError && <p className="text-red-500 text-xs px-1 mb-1">{createError}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-warm-800 text-warm-50 rounded-lg py-1.5 text-xs font-medium">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateRoom(false); setNewRoomName(""); setCreateError(""); }}
                    className="flex-1 bg-warm-200 text-warm-700 rounded-lg py-1.5 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreateRoom(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-warm-600 hover:text-warm-800 hover:bg-warm-200 transition-colors flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                New room
              </button>
            )}
          </div>

          {/* DMs */}
          <p className="text-warm-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2 mt-5">
            Direct Messages
          </p>
          {activeDMs.map((dmId) => {
            const partner = dmPartner(dmId, username);
            const isActive = activeRoom?.name === dmId;
            return (
              <button
                key={dmId}
                onClick={() => handleRoomSelect({ id: dmId, name: dmId, createdBy: "", createdAt: "" })}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2.5 mb-0.5
                  ${isActive
                    ? "bg-warm-400 text-warm-900 font-semibold"
                    : "text-warm-700 hover:bg-warm-200 hover:text-warm-900"}
                `}
              >
                <Avatar name={partner} size={22} />
                {partner}
              </button>
            );
          })}
          <button
            onClick={() => setShowDMSearch(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-warm-600 hover:text-warm-800 hover:bg-warm-200 transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            New message
          </button>
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-warm-400 flex items-center justify-between">
          <button
            onClick={() => {
              setEditDisplayName(myProfile?.displayName ?? "");
              setEditAvatarColor(myProfile?.avatarColor ?? PROFILE_COLORS[0]);
              setShowProfile(true);
            }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            {username && (
              <Avatar
                name={username}
                size={30}
                color={myProfile?.avatarColor ?? undefined}
              />
            )}
            <div className="text-left">
              <p className="text-warm-900 text-sm font-medium leading-none">
                {myProfile?.displayName || username}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-warm-500"}`} />
                <span className="text-warm-600 text-[10px]">{connected ? "online" : "connecting"}</span>
              </div>
            </div>
          </button>
          <button onClick={handleLogout} className="text-warm-600 text-xs hover:text-warm-900 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Chat area ───────────────────────────────────────── */}
      <main
        className={`
          ${mobileView === "rooms" ? "hidden" : "flex"} md:flex
          flex-1 flex-col min-w-0 bg-warm-100
        `}
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-warm-300 flex items-center gap-3 bg-warm-100 shrink-0">
          <button className="md:hidden text-warm-800 text-xl mr-1" onClick={() => setMobileView("rooms")}>
            ←
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {currentIsDM && activeRoom && (
              <Avatar name={dmPartner(activeRoom.name, username)} size={32} />
            )}
            <div>
              <p className="text-warm-900 font-semibold text-base">{headerTitle}</p>
              {!currentIsDM && onlineUsers.length > 0 && (
                <p className="text-warm-600 text-xs mt-0.5">{onlineUsers.length} online</p>
              )}
            </div>
          </div>
          {!currentIsDM && (
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                {onlineUsers.slice(0, 4).map((u) => (
                  <div key={u} className="ring-2 ring-warm-100 rounded-full">
                    <Avatar name={u} size={26} />
                  </div>
                ))}
                {onlineUsers.length > 4 && (
                  <div
                    className="ring-2 ring-warm-100 rounded-full bg-warm-400 flex items-center justify-center"
                    style={{ width: 26, height: 26 }}
                  >
                    <span className="text-warm-700 text-[10px] font-semibold">+{onlineUsers.length - 4}</span>
                  </div>
                )}
              </div>
              <span
                className="ml-1 p-1.5 rounded-lg text-warm-400 cursor-not-allowed"
                title="Search unavailable (messages are encrypted at rest)"
              >
                🔍
              </span>
            </div>
          )}
        </header>

        {/* Search panel */}
        {showSearch && (
          <div className="border-b border-warm-300 bg-warm-50 shrink-0">
            <div className="px-5 py-3">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2.5 text-sm text-warm-900 outline-none focus:border-warm-600 placeholder:text-warm-500"
              />
            </div>
            {searchQuery.trim() && (
              <div className="max-h-64 overflow-y-auto border-t border-warm-200">
                {searching && (
                  <p className="text-center text-warm-500 text-xs py-4">Searching...</p>
                )}
                {!searching && searchResults.length === 0 && (
                  <p className="text-center text-warm-500 text-xs py-4">No results for &quot;{searchQuery}&quot;</p>
                )}
                {!searching && searchResults.map((msg) => (
                  <div key={msg.id} className="flex gap-3 px-5 py-3 hover:bg-warm-100 border-b border-warm-200 last:border-0">
                    <Avatar name={msg.senderUsername} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-warm-900 text-xs font-semibold">{msg.senderUsername}</span>
                        <span className="text-warm-500 text-[10px]">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-warm-700 text-xs truncate">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-0.5"
          onClick={() => setEmojiPickerFor(null)}
        >
          <div ref={topSentinelRef} className="h-px" />
          {loadingMore && (
            <p className="text-center text-warm-500 text-xs py-2">Loading older messages...</p>
          )}
          {!activeRoom && (
            <p className="text-center text-warm-500 text-sm mt-12">Select a room to start chatting</p>
          )}

          {allMessages.map((msg) => {
            const display = messageOverrides[msg.id] ?? msg;
            const reactionEntries = Object.entries(display.reactions ?? {});

            return (
              <div key={msg.id} className="flex gap-3 py-2 group relative">
                <Avatar name={display.senderUsername} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-warm-900 text-sm font-semibold">{display.senderUsername}</span>
                    <span className="text-warm-500 text-xs">{formatTime(display.timestamp)}</span>
                  </div>

                  {display.replyToId && display.replyPreview && (
                    <div className="border-l-2 border-warm-500 pl-2.5 mb-1.5 py-0.5 bg-warm-200 rounded-r-md">
                      <p className="text-warm-600 text-xs truncate">{display.replyPreview}</p>
                    </div>
                  )}

                  <p className="text-warm-800 text-sm leading-relaxed break-words">{display.content}</p>

                  {reactionEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {reactionEntries.map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
                            ${users.includes(username)
                              ? "bg-warm-300 border-warm-600 text-warm-900"
                              : "bg-warm-50 border-warm-300 text-warm-700 hover:border-warm-500"
                            }`}
                        >
                          {emoji} <span className="font-medium">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`flex items-start gap-0.5 shrink-0 transition-opacity ${
                    emojiPickerFor === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {emojiPickerFor === msg.id ? (
                    <div className="flex gap-0.5 bg-white border border-warm-300 rounded-xl px-2 py-1.5 shadow-sm">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { handleReaction(msg.id, emoji); setEmojiPickerFor(null); }}
                          className="hover:scale-125 transition-transform text-base leading-none p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button onClick={() => setEmojiPickerFor(null)} className="text-warm-400 hover:text-warm-700 text-xs ml-1 self-center">✕</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReply(display)}
                        className="text-warm-500 hover:text-warm-800 text-sm px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
                        title="Reply"
                      >
                        ↩
                      </button>
                      <button
                        onClick={() => setEmojiPickerFor(msg.id)}
                        className="text-warm-500 hover:text-warm-800 text-sm px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
                        title="React"
                      >
                        😊
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        <div className="px-5 h-5 shrink-0">
          {typingLine && <p className="text-warm-600 text-xs italic">{typingLine}</p>}
        </div>

        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-3 px-5 py-2 bg-warm-200 border-t border-warm-300 shrink-0">
            <div className="border-l-2 border-warm-700 pl-2.5 flex-1 min-w-0">
              <p className="text-warm-800 text-xs font-semibold">Replying to {replyTo.username}</p>
              <p className="text-warm-600 text-xs truncate">{replyTo.preview}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-warm-500 hover:text-warm-900 text-lg leading-none">×</button>
          </div>
        )}

        {/* Input */}
        <div className="px-5 pb-6 pt-3 bg-warm-100 border-t border-warm-300 shrink-0">
          <form onSubmit={handleSend}>
            <div className="flex items-center gap-3 bg-white border border-warm-300 rounded-2xl px-4 py-3 focus-within:border-warm-500 transition-colors">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={currentIsDM && activeRoom
                  ? `Message ${dmPartner(activeRoom.name, username)}`
                  : `Message #${activeRoom?.name ?? ""}`}
                className="flex-1 bg-transparent text-warm-900 text-sm outline-none placeholder:text-warm-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className={`text-sm font-semibold px-4 py-1.5 rounded-xl transition-all ${
                  input.trim()
                    ? "bg-warm-800 text-warm-50 hover:bg-warm-900"
                    : "bg-warm-200 text-warm-500 cursor-default"
                }`}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ── Profile Modal ───────────────────────────────────── */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 px-4"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-warm-50 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4">
              <p className="text-warm-900 font-semibold text-sm mb-4">Edit Profile</p>

              {/* Avatar preview */}
              <div className="flex justify-center mb-4">
                <Avatar name={username} size={64} color={editAvatarColor} />
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div>
                  <label className="text-warm-700 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                    Display Name
                  </label>
                  <input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder={username}
                    className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-2.5 text-sm text-warm-900 outline-none focus:border-warm-600 placeholder:text-warm-500"
                  />
                  <p className="text-warm-500 text-xs mt-1">Shown in the sidebar. Username stays the same.</p>
                </div>

                <div>
                  <label className="text-warm-700 text-xs font-semibold uppercase tracking-wide block mb-2">
                    Avatar Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {PROFILE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditAvatarColor(color)}
                        style={{ background: color }}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          editAvatarColor === color ? "ring-2 ring-offset-2 ring-warm-700 scale-110" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 bg-warm-800 text-warm-50 rounded-xl py-2.5 text-sm font-semibold hover:bg-warm-900 disabled:opacity-50 transition-colors"
                  >
                    {savingProfile ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfile(false)}
                    className="flex-1 bg-warm-200 text-warm-700 rounded-xl py-2.5 text-sm font-medium hover:bg-warm-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── DM Search Modal ─────────────────────────────────── */}
      {showDMSearch && (
        <div
          className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 px-4"
          onClick={() => { setShowDMSearch(false); setDmQuery(""); setDmResults([]); }}
        >
          <div
            className="bg-warm-50 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-4 pb-3 border-b border-warm-300">
              <p className="text-warm-900 font-semibold text-sm mb-3">New Direct Message</p>
              <input
                ref={dmSearchRef}
                value={dmQuery}
                onChange={(e) => setDmQuery(e.target.value)}
                placeholder="Search by username..."
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-2.5 text-sm text-warm-900 outline-none focus:border-warm-600 placeholder:text-warm-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {dmResults.length === 0 && dmQuery.trim() && (
                <p className="text-warm-500 text-sm text-center py-6">No users found</p>
              )}
              {dmResults.length === 0 && !dmQuery.trim() && (
                <p className="text-warm-500 text-sm text-center py-6">Type a username to search</p>
              )}
              {dmResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startDM(user.username)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-200 transition-colors"
                >
                  <Avatar name={user.username} size={34} />
                  <span className="text-warm-900 text-sm font-medium">{user.username}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-warm-300">
              <button
                onClick={() => { setShowDMSearch(false); setDmQuery(""); setDmResults([]); }}
                className="w-full text-warm-600 text-sm hover:text-warm-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
