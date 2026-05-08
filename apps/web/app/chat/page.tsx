"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hash, Search, Pin, Settings, Menu, MessageCircle, Compass, Bookmark,
} from "lucide-react";

import { useWebSocket } from "../../features/messaging/hooks/useWebSocket";
import { useMessages } from "../../features/messaging/hooks/useMessages";
import { useThread } from "../../features/messaging/hooks/useThread";
import { useTyping } from "../../features/messaging/hooks/useTyping";
import { useRooms } from "../../features/rooms/hooks/useRooms";
import { useRoomMembers } from "../../features/rooms/hooks/useRoomMembers";
import { usePresence } from "../../features/presence/hooks/usePresence";
import { useProfile } from "../../features/users/hooks/useProfile";
import { usePinning } from "../../features/pinning/hooks/usePinning";
import { useBookmarks } from "../../features/bookmarks/hooks/useBookmarks";
import { useSearch } from "../../features/search/hooks/useSearch";
import { useReadReceipts } from "../../features/read-receipts/hooks/useReadReceipts";
import { useUpload } from "../../features/upload/hooks/useUpload";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";

import type { Section } from "../../features/layout/components/Sidebar";
import { Sidebar } from "../../features/layout/components/Sidebar";
import { RoomSettingsModal } from "../../features/rooms/components/RoomSettingsModal";
import { CreateRoomModal } from "../../features/rooms/components/CreateRoomModal";
import { MessageItem } from "../../features/messaging/components/MessageItem";
import { MessageInput } from "../../features/messaging/components/MessageInput";
import { SearchPanel } from "../../features/search/components/SearchPanel";
import { ThreadPanel } from "../../features/messaging/components/ThreadPanel";
import { PinnedPanel } from "../../features/pinning/components/PinnedPanel";
import { BookmarksPanel } from "../../features/bookmarks/components/BookmarksPanel";
import { PinLimitModal } from "../../features/pinning/components/PinLimitModal";
import { ProfileModal } from "../../features/users/components/ProfileModal";
import { DMSearchModal } from "../../features/users/components/DMSearchModal";
import { Avatar } from "../../features/users/components/Avatar";
import { StatusDot } from "../../features/users/components/StatusDot";

import { toggleReaction, editMessage, deleteMessage } from "../../features/messaging/api";
import { searchUsers, updateProfile } from "../../features/users/api";
import { updateRoomDescription } from "../../features/rooms/api";

import { Room, ReplyTo, UserSummary } from "../../shared/types";
import { isDM, dmPartner, buildDMRoomId, typingText } from "../../shared/lib/utils";

function readUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";
    return JSON.parse(atob(token.split(".")[1])).sub ?? "";
  } catch { return ""; }
}

function readActiveDMs(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("talkspace_dms") ?? "[]"); }
  catch { return []; }
}

type RightPanel = "thread" | "pinned" | "search" | "bookmarks" | null;

export default function ChatPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");
  const prevRoomRef = useRef<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [activeDMs, setActiveDMs] = useState<string[]>([]);
  const [showDMSearch, setShowDMSearch] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [dmResults, setDmResults] = useState<UserSummary[]>([]);
  const [section, setSection] = useState<Section>("rooms");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [unreadBanner, setUnreadBanner] = useState(0);
  const isAtBottomRef = useRef(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const threadStreamRef = useRef<HTMLDivElement>(null);

  const rooms = useRooms();
  const { activeRoom, selectRoom, updateRoom, removeRoom } = rooms;

  const { messages, wsEvents, threadReplies, typingUsers, threadTypingUsers, connected, sendMessage, sendTyping, sendThreadTyping } =
    useWebSocket(activeRoom?.name ?? "");

  const thread = useThread(activeRoom?.name ?? "", threadReplies);
  const msgs = useMessages(activeRoom, messages, wsEvents, scrollContainerRef, bottomRef, topSentinelRef);
  const { onKeyPress: onTypingKeyPress } = useTyping(sendTyping);
  const threadTypingThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onThreadTyping(threadId: string) {
    if (!threadTypingThrottle.current) {
      sendThreadTyping(threadId);
      threadTypingThrottle.current = setTimeout(() => { threadTypingThrottle.current = null; }, 1000);
    }
  }
  const { onlineUsers, onlineGlobal } = usePresence(activeRoom?.name ?? null);
  const profile = useProfile();
  const pinning = usePinning(activeRoom);
  const bookmarks = useBookmarks();
  const search = useSearch(activeRoom);
  const { receipts, fetchReceipts } = useReadReceipts(
    profile.myProfile?.showReadReceipts ?? false,
    msgs.history, messages, username, scrollContainerRef,
  );
  const { receipts: threadReceipts, fetchReceipts: fetchThreadReceipts } = useReadReceipts(
    profile.myProfile?.showReadReceipts ?? false,
    thread.threadMessages, [], username, threadStreamRef,
  );
  const { notify } = useNotifications();
  const upload = useUpload((payload) => sendMessage("", undefined, undefined, payload));
  const roomMembers = useRoomMembers(activeRoom, username);

  useEffect(() => {
    setUsername(readUsername());
    setActiveDMs(readActiveDMs());
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setRightPanel((prev) => prev === "search" ? null : "search");
      }
      if (e.key === "Escape") {
        setRightPanel(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || !activeRoom) return;
    if (last.senderUsername !== username) {
      const isMentioned = last.mentions?.includes(username) ?? false;
      if (isMentioned || !document.hasFocus()) {
        notify(
          isMentioned ? `${last.senderUsername} mentioned you` : last.senderUsername,
          last.content,
        );
      }
      if (isMentioned) {
        rooms.setMentionCounts((prev) => ({
          ...prev,
          [activeRoom.name]: (prev[activeRoom.name] ?? 0) + 1,
        }));
      }
      // Show unread banner when user has scrolled up
      if (!isAtBottomRef.current) {
        setUnreadBanner((n) => n + 1);
      }
    }
  }, [messages, activeRoom, username, notify, rooms.setMentionCounts]);

  function openRightPanel(panel: RightPanel) {
    if (panel !== "thread") thread.closeThread();
    if (panel !== "pinned") pinning.setShowPinned(false);
    if (panel !== "search") search.closeSearch();
    setRightPanel(panel);
  }

  function closeRightPanel() {
    thread.closeThread();
    pinning.setShowPinned(false);
    search.closeSearch();
    setRightPanel(null);
  }

  function handleRightPanelToggle(panel: "pinned" | "search" | "bookmarks") {
    if (rightPanel === panel) { closeRightPanel(); return; }
    openRightPanel(panel);
    if (panel === "search") setTimeout(() => search.searchInputRef.current?.focus(), 50);
  }

  // Save draft when input changes
  useEffect(() => {
    if (!activeRoom) return;
    const key = `draft:${activeRoom.name}`;
    if (input) {
      localStorage.setItem(key, input);
    } else {
      localStorage.removeItem(key);
    }
  }, [input, activeRoom]);

  // Restore draft when switching rooms
  useEffect(() => {
    if (!activeRoom) return;
    if (prevRoomRef.current !== activeRoom.name) {
      prevRoomRef.current = activeRoom.name;
      const saved = localStorage.getItem(`draft:${activeRoom.name}`) ?? "";
      setInput(saved);
      setReplyTo(null);
    }
  }, [activeRoom]);

  function handleRoomSelect(room: Room) {
    selectRoom(room);
    closeRightPanel();
    setSidebarOpen(false);
    setUnreadBanner(0);
    isAtBottomRef.current = true;
  }

  function handleSectionChange(s: Section) {
    if (s === "browse") { router.push("/browse"); return; }
    setSection(s);
    setSidebarOpen(true);
  }

  async function handleCommand(cmd: string, arg: string) {
    const p = profile.myProfile;
    switch (cmd) {
      case "active":
        if (p) await updateProfile(p.displayName ?? "", p.avatarColor ?? "", p.showReadReceipts ?? false, "available", p.statusText ?? "");
        break;
      case "away":
        if (p) await updateProfile(p.displayName ?? "", p.avatarColor ?? "", p.showReadReceipts ?? false, "away", p.statusText ?? "");
        break;
      case "dnd":
        if (p) await updateProfile(p.displayName ?? "", p.avatarColor ?? "", p.showReadReceipts ?? false, "dnd", p.statusText ?? "");
        break;
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    let content = input.trim();
    if (!content || !activeRoom) return;

    if (content.startsWith("/")) {
      const spaceIdx = content.indexOf(" ");
      const cmd = spaceIdx === -1 ? content.slice(1) : content.slice(1, spaceIdx);
      const arg = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1).trim();

      switch (cmd) {
        case "shrug":
          content = "¯\\_(ツ)_/¯";
          break;
        case "me":
          if (!arg) { setInput(""); return; }
          content = `_${arg}_`;
          break;
        case "dm":
          if (arg) startDM(arg);
          setInput(""); return;
        case "status":
          if (arg && profile.myProfile) {
            const p = profile.myProfile;
            updateProfile(p.displayName ?? "", p.avatarColor ?? "", p.showReadReceipts ?? false, p.status ?? "available", arg);
          }
          setInput(""); return;
        case "topic":
          if (arg && activeRoom) {
            updateRoomDescription(activeRoom.name, arg).then(updateRoom);
          }
          setInput(""); return;
        default:
          // unknown command — don't send
          return;
      }
    }

    sendMessage(content, replyTo?.id, replyTo?.preview);
    setInput("");
    setReplyTo(null);
  }

  function handleSendThreadReply(content: string, threadId: string) {
    sendMessage(content, undefined, undefined, undefined, threadId);
  }

  async function handleReaction(messageId: string, emoji: string) {
    const allMsgs = [...msgs.history, ...messages];
    const prev = msgs.optimisticReaction(messageId, emoji, username, allMsgs);
    if (!prev) return;
    try {
      const updated = await toggleReaction(messageId, emoji);
      msgs.applyReaction(messageId, updated);
    } catch { msgs.revertReaction(messageId); }
  }

  async function handleSubmitEdit(messageId: string) {
    if (!msgs.editDraft.trim()) return;
    try {
      const updated = await editMessage(messageId, msgs.editDraft.trim());
      msgs.applyEdit(messageId, updated);
    } finally { msgs.cancelEdit(); }
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteMessage(messageId);
      msgs.removeMessage(messageId);
    } catch { /* server broadcasts deletion */ }
  }

  async function startDM(targetUsername: string) {
    const roomId = buildDMRoomId(username, targetUsername);
    const updated = [...new Set([...activeDMs, roomId])];
    setActiveDMs(updated);
    localStorage.setItem("talkspace_dms", JSON.stringify(updated));
    handleRoomSelect({ id: roomId, name: roomId, createdBy: "", createdAt: "" });
    setShowDMSearch(false);
    setDmQuery(""); setDmResults([]);
    setSection("dms");
  }

  const currentIsDM = activeRoom ? isDM(activeRoom.name) : false;
  const typingLine = typingText(typingUsers, username);

  const seen = new Set<string>();
  const allMessages = [...msgs.history, ...messages].filter((m) => {
    if (!m.id || seen.has(m.id) || m.threadId) return false;
    seen.add(m.id); return true;
  });

  const headerTitle = activeRoom
    ? currentIsDM ? dmPartner(activeRoom.name, username) : activeRoom.name
    : "";

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* Sidebar */}
      <Sidebar
        section={section}
        onSectionChange={handleSectionChange}
        rooms={rooms.rooms}
        activeRoom={activeRoom}
        activeDMs={activeDMs}
        username={username}
        myProfile={profile.myProfile}
        connected={connected}
        unreadCounts={rooms.unreadCounts}
        mentionCounts={rooms.mentionCounts}
        onlineGlobal={onlineGlobal}
        newRoomName={rooms.newRoomName}
        setNewRoomName={rooms.setNewRoomName}
        newRoomPrivate={rooms.newRoomPrivate}
        setNewRoomPrivate={rooms.setNewRoomPrivate}
        showCreateRoom={rooms.showCreateRoom}
        setShowCreateRoom={rooms.setShowCreateRoom}
        createError={rooms.createError}
        setCreateError={rooms.setCreateError}
        onCreateRoom={rooms.handleCreateRoom}
        onRoomSelect={handleRoomSelect}
        onOpenProfile={profile.openProfile}
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("talkspace_dms");
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          router.push("/login");
        }}
        onNewDM={() => setShowDMSearch(true)}
        onOpenSearch={() => openRightPanel("search")}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: "var(--panel)" }}>

        {/* Topbar */}
        <header className="topbar">
          {/* Mobile menu button */}
          <button
            className="icon-btn lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {activeRoom ? (
              <>
                {currentIsDM && <Avatar name={dmPartner(activeRoom.name, username)} size={18} style={{ borderRadius: "50%" }} />}
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{headerTitle}</span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: "var(--text-faint)" }}>TalkSpace</span>
            )}
          </div>

          <div className="topbar-spacer" />

          {/* Actions */}
          <button
            className="icon-btn"
            title="Saved messages"
            onClick={() => handleRightPanelToggle("bookmarks")}
            style={rightPanel === "bookmarks" ? { background: "var(--hover)", color: "var(--accent)" } : {}}
          >
            <Bookmark size={16} strokeWidth={1.75} />
          </button>

          {activeRoom && (
            <>
              {!currentIsDM && onlineUsers.length > 0 && (
                <div className="flex -space-x-1.5">
                  {onlineUsers.slice(0, 4).map((u) => (
                    <div key={u} style={{ border: "2px solid var(--panel)", borderRadius: "50%" }}>
                      <Avatar name={u} size={24} />
                    </div>
                  ))}
                  {onlineUsers.length > 4 && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                      style={{ background: "var(--panel-3)", color: "var(--text-muted)", border: "2px solid var(--panel)" }}
                    >
                      +{onlineUsers.length - 4}
                    </div>
                  )}
                </div>
              )}
              {!currentIsDM && (
                <>
                  <button
                    className="icon-btn"
                    title="Search"
                    onClick={() => handleRightPanelToggle("search")}
                    style={rightPanel === "search" ? { background: "var(--hover)", color: "var(--text)" } : {}}
                  >
                    <Search size={16} strokeWidth={1.75} />
                  </button>
                  {pinning.pinnedIds.length > 0 && (
                    <button
                      className="icon-btn"
                      title={`Pinned (${pinning.pinnedIds.length})`}
                      onClick={() => handleRightPanelToggle("pinned")}
                      style={rightPanel === "pinned" ? { background: "var(--hover)", color: "var(--text)" } : {}}
                    >
                      <Pin size={16} strokeWidth={1.75} />
                    </button>
                  )}
                  <button className="icon-btn" title="Members & settings" onClick={() => roomMembers.setShowRoomSettings(true)}>
                    <Settings size={16} strokeWidth={1.75} />
                  </button>
                </>
              )}
            </>
          )}
        </header>

        {/* Messages + right panel row */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          <div className="flex flex-col flex-1 min-w-0">
            {/* scroll wrapper — relative so blur overlay can be absolute inside it */}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <div ref={scrollContainerRef} style={{ position: "absolute", inset: 0, overflowY: "auto", paddingBottom: 56 }}
                 onClick={() => setEmojiPickerFor(null)}
                 onScroll={(e) => {
                   const el = e.currentTarget;
                   const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                   isAtBottomRef.current = atBottom;
                   if (atBottom) setUnreadBanner(0);
                 }}>
              <div ref={topSentinelRef} className="h-px" />
              {msgs.loadingMore && (
                <p className="text-center text-xs py-2" style={{ color: "var(--text-3)" }}>Loading…</p>
              )}
              {!activeRoom && (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <p className="text-[20px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>Welcome to TalkSpace</p>
                  <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>Select a channel or DM from the sidebar to get started.</p>
                </div>
              )}
              {/* Notion-style page header for the channel */}
              {activeRoom && (
                <div className="channel-header">
                  <div className="channel-header-icon">
                    {currentIsDM
                      ? <Avatar name={dmPartner(activeRoom.name, username)} size={40} style={{ borderRadius: "50%" }} />
                      : <Hash size={28} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
                    }
                  </div>
                  <h1 className="channel-header-title">{headerTitle}</h1>
                  {!currentIsDM && (
                    <p className="channel-header-desc">
                      {activeRoom.description
                        ? activeRoom.description
                        : <>This is the beginning of <strong>#{headerTitle}</strong></>}
                    </p>
                  )}
                </div>
              )}
              {allMessages.map((msg, idx) => {
                const display = msgs.messageOverrides[msg.id] ?? msg;
                const prev = idx > 0 ? allMessages[idx - 1] : null;
                const isGrouped = !!(
                  prev &&
                  prev.senderUsername === msg.senderUsername &&
                  new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime() < 5 * 60 * 1000
                );
                return (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    display={display}
                    username={username}
                    myAvatarColor={profile.myProfile?.avatarColor}
                    isGrouped={isGrouped}
                    editingId={msgs.editingId}
                    editDraft={msgs.editDraft}
                    setEditDraft={msgs.setEditDraft}
                    emojiPickerFor={emojiPickerFor}
                    setEmojiPickerFor={setEmojiPickerFor}
                    currentIsDM={currentIsDM}
                    pinnedIds={pinning.pinnedIds}
                    receipts={receipts}
                    showReadReceipts={profile.myProfile?.showReadReceipts ?? false}
                    onReply={(m) => { setReplyTo({ id: m.id, username: m.senderUsername, preview: m.content }); setEmojiPickerFor(null); }}
                    onReaction={handleReaction}
                    onStartEdit={(m) => { msgs.startEdit(m); setEmojiPickerFor(null); }}
                    onSubmitEdit={handleSubmitEdit}
                    onCancelEdit={msgs.cancelEdit}
                    onDelete={handleDelete}
                    onPin={pinning.handlePin}
                    onUnpin={pinning.handleUnpin}
                    onFetchReceipts={fetchReceipts}
                    onOpenThread={(m) => { thread.openThread(m); openRightPanel("thread"); }}
                    isBookmarked={bookmarks.isBookmarked(msg.id, bookmarks.bookmarks)}
                    onBookmark={(m) => bookmarks.toggle(m, activeRoom)}
                  />
                );
              })}
              <div ref={bottomRef} />
            </div>
            {/* Jump-to-bottom banner */}
            {unreadBanner > 0 && (
              <button
                onClick={() => {
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                  setUnreadBanner(0);
                }}
                style={{
                  position: "absolute", bottom: 60, left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3, pointerEvents: "auto",
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 999,
                  background: "var(--accent)", color: "white",
                  border: 0, cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                  boxShadow: "0 2px 12px rgba(35,131,226,0.35)",
                  animation: "cmdRise 0.18s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                ↓ {unreadBanner} new {unreadBanner === 1 ? "message" : "messages"}
              </button>
            )}
            {/* Glass blur overlay — absolute on top of scroll, bottom-aligned, doesn't affect layout */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 48, pointerEvents: "none", zIndex: 2,
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 70%)",
              background: "linear-gradient(to bottom, transparent 0%, var(--panel) 100%)",
            }} />
            </div>{/* end scroll wrapper */}

            <div className="px-6 h-5 shrink-0 flex items-center">
              {typingLine && <p className="text-xs italic" style={{ color: "var(--text-faint)" }}>{typingLine}</p>}
            </div>

            <MessageInput
              input={input}
              setInput={setInput}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              onSend={handleSend}
              onCommand={handleCommand}
              onTyping={onTypingKeyPress}
              uploading={upload.uploading}
              uploadError={upload.uploadError}
              onFileSelect={upload.handleFileSelect}
              onPaste={upload.handlePaste}
              placeholder={
                currentIsDM && activeRoom
                  ? `Message ${dmPartner(activeRoom.name, username)}`
                  : activeRoom ? `Message #${activeRoom.name}` : "Select a channel…"
              }
            />
          </div>

          {/* Right panel */}
          {rightPanel === "thread" && thread.openThreadId && thread.rootMessage && (
            <ThreadPanel
              rootMessage={thread.rootMessage}
              threadMessages={thread.threadMessages}
              loading={thread.loading}
              activeRoomName={activeRoom?.name}
              typingUsers={(threadTypingUsers[thread.openThreadId] ?? []).filter(u => u !== username)}
              streamRef={threadStreamRef}
              receipts={threadReceipts}
              showReadReceipts={profile.myProfile?.showReadReceipts ?? false}
              username={username}
              onFetchReceipts={fetchThreadReceipts}
              onClose={closeRightPanel}
              onSendReply={handleSendThreadReply}
              onTyping={() => onThreadTyping(thread.openThreadId!)}
            />
          )}
          {rightPanel === "pinned" && (
            <PinnedPanel
              pinnedMessages={pinning.pinnedMessages}
              onUnpin={pinning.handleUnpin}
              onClose={closeRightPanel}
            />
          )}
          {rightPanel === "bookmarks" && (
            <BookmarksPanel
              bookmarks={bookmarks.bookmarks}
              onRemove={bookmarks.remove}
              onClose={closeRightPanel}
            />
          )}
        </div>
        </div>{/* end card inner */}
        </div>{/* end card */}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 flex items-center justify-around py-2 z-20 pb-safe"
           style={{ background: "var(--bg-sidebar)", borderTop: "1px solid var(--border)" }}>
        {([
          { id: "rooms", icon: <Hash size={19} strokeWidth={1.75} />, label: "Channels" },
          { id: "dms",   icon: <MessageCircle size={19} strokeWidth={1.75} />, label: "DMs" },
          { id: "browse",icon: <Compass size={19} strokeWidth={1.75} />, label: "Browse" },
        ] as { id: Section; icon: React.ReactNode; label: string }[]).map(({ id, icon, label }) => (
          <button key={id} onClick={() => handleSectionChange(id)}
                  className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl"
                  style={{ color: section === id ? "var(--accent)" : "var(--text-3)" }}>
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* Search overlay */}
      {rightPanel === "search" && (
        <SearchPanel
          searchQuery={search.searchQuery}
          setSearchQuery={search.setSearchQuery}
          searchResults={search.searchResults}
          searching={search.searching}
          searchInputRef={search.searchInputRef}
          onClose={closeRightPanel}
        />
      )}

      {/* Modals */}
      {profile.showProfile && (
        <ProfileModal
          username={username}
          editDisplayName={profile.editDisplayName}
          setEditDisplayName={profile.setEditDisplayName}
          editAvatarColor={profile.editAvatarColor}
          setEditAvatarColor={profile.setEditAvatarColor}
          editShowReceipts={profile.editShowReceipts}
          setEditShowReceipts={profile.setEditShowReceipts}
          editStatus={profile.editStatus}
          setEditStatus={profile.setEditStatus}
          editStatusText={profile.editStatusText}
          setEditStatusText={profile.setEditStatusText}
          savingProfile={profile.savingProfile}
          onSave={(e) => { e.preventDefault(); profile.saveProfile(); }}
          onClose={() => profile.setShowProfile(false)}
        />
      )}
      {showDMSearch && (
        <DMSearchModal
          dmQuery={dmQuery}
          setDmQuery={setDmQuery}
          dmResults={dmResults}
          onSelect={startDM}
          onClose={() => { setShowDMSearch(false); setDmQuery(""); setDmResults([]); }}
        />
      )}
      {roomMembers.showRoomSettings && activeRoom && !currentIsDM && (
        <RoomSettingsModal
          activeRoom={activeRoom}
          roomMembers={roomMembers.roomMembers}
          username={username}
          inviteUsername={roomMembers.inviteUsername}
          setInviteUsername={roomMembers.setInviteUsername}
          inviteError={roomMembers.inviteError}
          setInviteError={roomMembers.setInviteError}
          inviting={roomMembers.inviting}
          onInvite={(e) => roomMembers.handleInvite(e, updateRoom)}
          onKick={(target) => roomMembers.handleKickMember(target, updateRoom, () => {
            removeRoom(activeRoom.id);
            rooms.setActiveRoom(null);
          })}
          onUpdateRoom={updateRoom}
          onClose={() => roomMembers.setShowRoomSettings(false)}
        />
      )}
      {rooms.showCreateRoom && (
        <CreateRoomModal
          newRoomName={rooms.newRoomName}
          setNewRoomName={rooms.setNewRoomName}
          newRoomPrivate={rooms.newRoomPrivate}
          setNewRoomPrivate={rooms.setNewRoomPrivate}
          createError={rooms.createError}
          setCreateError={rooms.setCreateError}
          onCreateRoom={rooms.handleCreateRoom}
          onClose={() => rooms.setShowCreateRoom(false)}
        />
      )}
      {pinning.pendingPin && (
        <PinLimitModal
          pinnedMessages={pinning.pinnedMessages}
          onConfirm={pinning.confirmPin}
          onCancel={() => pinning.setPendingPin(null)}
        />
      )}
    </div>
  );
}

function HeaderBtn({ icon, title, active, onClick }: {
  icon: React.ReactNode; title: string; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-100"
      style={{
        background: active ? "var(--panel-3)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "var(--hover)";
          (e.currentTarget as HTMLElement).style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }
      }}
    >
      {icon}
    </button>
  );
}
