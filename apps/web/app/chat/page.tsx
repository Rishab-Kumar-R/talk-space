"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useWebSocket } from "../../features/messaging/hooks/useWebSocket";
import { useMessages } from "../../features/messaging/hooks/useMessages";
import { useThread } from "../../features/messaging/hooks/useThread";
import { useTyping } from "../../features/messaging/hooks/useTyping";
import { useRooms } from "../../features/rooms/hooks/useRooms";
import { useRoomMembers } from "../../features/rooms/hooks/useRoomMembers";
import { usePresence } from "../../features/presence/hooks/usePresence";
import { useProfile } from "../../features/users/hooks/useProfile";
import { usePinning } from "../../features/pinning/hooks/usePinning";
import { useSearch } from "../../features/search/hooks/useSearch";
import { useReadReceipts } from "../../features/read-receipts/hooks/useReadReceipts";
import { useUpload } from "../../features/upload/hooks/useUpload";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";

import { RoomSidebar } from "../../features/rooms/components/RoomSidebar";
import { RoomSettingsModal } from "../../features/rooms/components/RoomSettingsModal";
import { MessageItem } from "../../features/messaging/components/MessageItem";
import { MessageInput } from "../../features/messaging/components/MessageInput";
import { SearchPanel } from "../../features/search/components/SearchPanel";
import { ThreadPanel } from "../../features/messaging/components/ThreadPanel";
import { PinnedPanel } from "../../features/pinning/components/PinnedPanel";
import { PinLimitModal } from "../../features/pinning/components/PinLimitModal";
import { ProfileModal } from "../../features/users/components/ProfileModal";
import { DMSearchModal } from "../../features/users/components/DMSearchModal";
import { Avatar } from "../../features/users/components/Avatar";

import { toggleReaction, editMessage, deleteMessage } from "../../features/messaging/api";
import { searchUsers } from "../../features/users/api";

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

export default function ChatPage() {
  const router = useRouter();

  const [username, setUsername] = useState<string>("");
  const [mobileView, setMobileView] = useState<"rooms" | "chat">("rooms");
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [activeDMs, setActiveDMs] = useState<string[]>([]);
  const [showDMSearch, setShowDMSearch] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [dmResults, setDmResults] = useState<UserSummary[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const rooms = useRooms();
  const { activeRoom, selectRoom, updateRoom, removeRoom } = rooms;

  const { messages, wsEvents, threadReplies, typingUsers, connected, sendMessage, sendTyping } =
    useWebSocket(activeRoom?.name ?? "");

  const thread = useThread(activeRoom?.name ?? "", threadReplies);

  const msgs = useMessages(
    activeRoom,
    messages,
    wsEvents,
    scrollContainerRef,
    bottomRef,
    topSentinelRef,
  );

  const { onKeyPress: onTypingKeyPress } = useTyping(sendTyping);
  const { onlineUsers } = usePresence(activeRoom?.name ?? null);
  const profile = useProfile();
  const pinning = usePinning(activeRoom);
  const search = useSearch(activeRoom);
  const { receipts, fetchReceipts } = useReadReceipts(
    profile.myProfile?.showReadReceipts ?? false,
    msgs.history,
    messages,
    username,
    scrollContainerRef,
  );
  const { notify } = useNotifications();

  const handleSendFile = useCallback((payload: Parameters<typeof sendMessage>[3]) => {
    if (payload) sendMessage("", undefined, undefined, payload);
  }, [sendMessage]);

  const upload = useUpload(handleSendFile as (payload: { fileUrl: string; fileName: string; fileSize: number; mimeType: string; messageType: "image" | "file" }) => void);

  const roomMembers = useRoomMembers(activeRoom, username);

  // Hydrate localStorage-derived state after mount
  useEffect(() => {
    setUsername(readUsername());
    setActiveDMs(readActiveDMs());
  }, []);

  // Auth bootstrap — redirect if no token, then load profile
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    profile.loadProfile();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify on new incoming messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || !activeRoom) return;
    if (last.senderUsername === username) return;
    const sender = last.senderUsername;
    const room = isDM(activeRoom.name) ? sender : `#${activeRoom.name}`;
    notify(`${sender} in ${room}`, last.content.slice(0, 100));
  }, [messages, activeRoom, username, notify]);

  // DM search (debounced) — always async so setState never fires synchronously in the effect body
  useEffect(() => {
    const t = setTimeout(() => {
      if (!dmQuery.trim()) { setDmResults([]); return; }
      searchUsers(dmQuery).then(setDmResults);
    }, dmQuery.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [dmQuery]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerFor) return;
    const handler = () => setEmojiPickerFor(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [emojiPickerFor]);

  function handleRoomSelect(room: Room) {
    selectRoom(room);
    setMobileView("chat");
    setReplyTo(null);
    setEmojiPickerFor(null);
  }

  function startDM(targetUsername: string) {
    const roomId = buildDMRoomId(username, targetUsername);
    const updated = activeDMs.includes(roomId) ? activeDMs : [...activeDMs, roomId];
    setActiveDMs(updated);
    localStorage.setItem("talkspace_dms", JSON.stringify(updated));
    handleRoomSelect({ id: roomId, name: roomId, createdBy: "", createdAt: "" });
    setShowDMSearch(false);
    setDmQuery("");
    setDmResults([]);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim(), replyTo?.id, replyTo ? `${replyTo.username}: ${replyTo.preview}` : undefined);
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
    } catch {
      msgs.revertReaction(messageId);
    }
  }

  async function handleSubmitEdit(messageId: string) {
    if (!msgs.editDraft.trim()) return;
    try {
      const updated = await editMessage(messageId, msgs.editDraft.trim());
      msgs.applyEdit(messageId, updated);
    } finally {
      msgs.cancelEdit();
    }
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteMessage(messageId);
      msgs.removeMessage(messageId);
    } catch { /* server broadcasts deletion */ }
  }

  const currentIsDM = activeRoom ? isDM(activeRoom.name) : false;
  const headerTitle = activeRoom
    ? currentIsDM ? dmPartner(activeRoom.name, username) : `# ${activeRoom.name}`
    : "";
  const typingLine = typingText(typingUsers, username);

  const seen = new Set<string>();
  const allMessages = [...msgs.history, ...messages].filter((m) => {
    if (!m.id || seen.has(m.id) || m.threadId) return false;
    seen.add(m.id);
    return true;
  });

  return (
    <div className="h-screen flex overflow-hidden bg-warm-200">

      {/* Sidebar */}
      <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex w-full md:w-auto`}>
        <RoomSidebar
          rooms={rooms.rooms}
          activeRoom={activeRoom}
          activeDMs={activeDMs}
          username={username}
          myProfile={profile.myProfile}
          connected={connected}
          unreadCounts={rooms.unreadCounts}
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
        />
      </div>

      {/* Chat area + thread panel */}
      <div className={`${mobileView === "rooms" ? "hidden" : "flex"} md:flex flex-1 min-w-0`}>
      <main className="flex flex-1 flex-col min-w-0 bg-warm-100">

        {/* Header */}
        <header className="px-5 py-4 border-b border-warm-300 flex items-center gap-3 bg-warm-100 shrink-0">
          <button className="md:hidden text-warm-800 text-xl mr-1" onClick={() => setMobileView("rooms")}>←</button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {currentIsDM && activeRoom && (
              <div className="relative shrink-0">
                <Avatar name={dmPartner(activeRoom.name, username)} size={32} />
              </div>
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
              {pinning.pinnedIds.length > 0 && (
                <button
                  onClick={() => pinning.setShowPinned((v) => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                    pinning.showPinned ? "bg-warm-300 text-warm-900" : "text-warm-500 hover:text-warm-900 hover:bg-warm-200"
                  }`}
                  title="Pinned messages"
                >
                  📌 <span className="font-medium">{pinning.pinnedIds.length}</span>
                </button>
              )}
              <div className="flex items-center -space-x-2">
                {onlineUsers.slice(0, 4).map((u) => (
                  <div key={u} className="ring-2 ring-warm-100 rounded-full">
                    <Avatar name={u} size={26} />
                  </div>
                ))}
                {onlineUsers.length > 4 && (
                  <div className="ring-2 ring-warm-100 rounded-full bg-warm-400 flex items-center justify-center" style={{ width: 26, height: 26 }}>
                    <span className="text-warm-700 text-[10px] font-semibold">+{onlineUsers.length - 4}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => search.showSearch ? search.closeSearch() : search.openSearch()}
                className={`ml-1 p-1.5 rounded-lg transition-colors ${
                  search.showSearch ? "bg-warm-300 text-warm-900" : "text-warm-500 hover:text-warm-900 hover:bg-warm-200"
                }`}
                title="Search messages"
              >
                🔍
              </button>
              <button
                onClick={() => roomMembers.setShowRoomSettings(true)}
                className="p-1.5 rounded-lg text-warm-500 hover:text-warm-900 hover:bg-warm-200 transition-colors"
                title="Room settings"
              >
                ⚙️
              </button>
            </div>
          )}
        </header>

        {search.showSearch && (
          <SearchPanel
            searchQuery={search.searchQuery}
            setSearchQuery={search.setSearchQuery}
            searchResults={search.searchResults}
            searching={search.searching}
            searchInputRef={search.searchInputRef}
            onClose={search.closeSearch}
          />
        )}

        {pinning.showPinned && !currentIsDM && (
          <PinnedPanel
            pinnedMessages={pinning.pinnedMessages}
            onUnpin={pinning.handleUnpin}
            onClose={() => pinning.setShowPinned(false)}
          />
        )}

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-0.5"
          onClick={() => setEmojiPickerFor(null)}
        >
          <div ref={topSentinelRef} className="h-px" />
          {msgs.loadingMore && (
            <p className="text-center text-warm-500 text-xs py-2">Loading older messages...</p>
          )}
          {!activeRoom && (
            <p className="text-center text-warm-500 text-sm mt-12">Select a room to start chatting</p>
          )}

          {allMessages.map((msg) => {
            const display = msgs.messageOverrides[msg.id] ?? msg;
            return (
              <MessageItem
                key={msg.id}
                msg={msg}
                display={display}
                username={username}
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
                onOpenThread={thread.openThread}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        <div className="px-5 h-5 shrink-0">
          {typingLine && <p className="text-warm-600 text-xs italic">{typingLine}</p>}
        </div>

        <MessageInput
          input={input}
          setInput={setInput}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onSend={handleSend}
          onTyping={onTypingKeyPress}
          uploading={upload.uploading}
          uploadError={upload.uploadError}
          onFileSelect={upload.handleFileSelect}
          onPaste={upload.handlePaste}
          placeholder={
            currentIsDM && activeRoom
              ? `Message ${dmPartner(activeRoom.name, username)}`
              : `Message #${activeRoom?.name ?? ""}`
          }
        />
      </main>

      {thread.openThreadId && thread.rootMessage && (
        <ThreadPanel
          rootMessage={thread.rootMessage}
          threadMessages={thread.threadMessages}
          loading={thread.loading}
          onClose={thread.closeThread}
          onSendReply={handleSendThreadReply}
        />
      )}
      </div>

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
          onClose={() => roomMembers.setShowRoomSettings(false)}
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
