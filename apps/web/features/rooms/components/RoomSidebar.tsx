"use client";

import { useRef, useEffect } from "react";
import { Hash, Lock } from "lucide-react";
import { Room, UserProfile } from "../../../shared/types";
import { isDM, dmPartner } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { STATUS_LABEL } from "../../users/components/StatusDot";

interface Props {
  rooms: Room[];
  activeRoom: Room | null;
  activeDMs: string[];
  username: string;
  myProfile: UserProfile | null;
  connected: boolean;
  unreadCounts: Record<string, number>;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  newRoomPrivate: boolean;
  setNewRoomPrivate: (v: boolean) => void;
  showCreateRoom: boolean;
  setShowCreateRoom: (v: boolean) => void;
  createError: string;
  setCreateError: (v: string) => void;
  onCreateRoom: (e: React.FormEvent) => void;
  onRoomSelect: (room: Room) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onNewDM: () => void;
}

export function RoomSidebar({
  rooms, activeRoom, activeDMs, username, myProfile, connected,
  unreadCounts, newRoomName, setNewRoomName,
  newRoomPrivate, setNewRoomPrivate,
  showCreateRoom, setShowCreateRoom,
  createError, setCreateError,
  onCreateRoom, onRoomSelect, onOpenProfile, onLogout, onNewDM,
}: Props) {
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCreateRoom) setTimeout(() => createInputRef.current?.focus(), 50);
  }, [showCreateRoom]);

  return (
    <aside className="flex flex-col w-full md:w-64 shrink-0 bg-warm-300 border-r border-warm-400">
      <div className="px-5 py-5 border-b border-warm-400">
        <span className="text-warm-900 text-lg font-bold tracking-tight">TalkSpace</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-warm-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
          Rooms
        </p>
        {rooms.map((room) => {
          const unread = unreadCounts[room.name] ?? 0;
          return (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room)}
              className={`
                w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 mb-0.5
                ${activeRoom?.id === room.id
                  ? "bg-warm-400 text-warm-900 font-semibold"
                  : "text-warm-700 hover:bg-warm-200 hover:text-warm-900"}
              `}
            >
              {room.isPrivate
                ? <Lock size={11} className="text-warm-500 shrink-0" />
                : <Hash size={11} className="text-warm-500 shrink-0" />}
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
            <form onSubmit={onCreateRoom} className="px-1">
              <input
                ref={createInputRef}
                value={newRoomName}
                onChange={(e) => { setNewRoomName(e.target.value); setCreateError(""); }}
                placeholder="room-name"
                className="w-full bg-warm-100 border border-warm-400 rounded-lg px-3 py-2 text-sm text-warm-900 outline-none focus:border-warm-700 placeholder:text-warm-500 mb-1.5"
              />
              <button
                type="button"
                onClick={() => setNewRoomPrivate(!newRoomPrivate)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs mb-1.5 transition-colors ${
                  newRoomPrivate ? "bg-warm-400 text-warm-900" : "bg-warm-200 text-warm-600"
                }`}
              >
                <span className="flex items-center gap-1">
                  {newRoomPrivate ? <Lock size={11} /> : <Hash size={11} />}
                  {newRoomPrivate ? "Private room" : "Public room"}
                </span>
                <span className="text-warm-500">{newRoomPrivate ? "members only" : "anyone can join"}</span>
              </button>
              {createError && <p className="text-red-500 text-xs px-1 mb-1">{createError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-warm-800 text-warm-50 rounded-lg py-1.5 text-xs font-medium">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateRoom(false); setNewRoomName(""); setNewRoomPrivate(false); setCreateError(""); }}
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

        <p className="text-warm-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2 mt-5">
          Direct Messages
        </p>
        {activeDMs.map((dmId) => {
          const partner = dmPartner(dmId, username);
          const isActive = activeRoom?.name === dmId;
          return (
            <button
              key={dmId}
              onClick={() => onRoomSelect({ id: dmId, name: dmId, createdBy: "", createdAt: "" })}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2.5 mb-0.5
                ${isActive
                  ? "bg-warm-400 text-warm-900 font-semibold"
                  : "text-warm-700 hover:bg-warm-200 hover:text-warm-900"}
              `}
            >
              <div className="relative">
                <Avatar name={partner} size={22} />
              </div>
              {partner}
            </button>
          );
        })}
        <button
          onClick={onNewDM}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-warm-600 hover:text-warm-800 hover:bg-warm-200 transition-colors flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          New message
        </button>
      </div>

      <div className="px-4 py-4 border-t border-warm-400 flex items-center justify-between">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          {username && (
            <Avatar name={username} size={30} color={myProfile?.avatarColor ?? undefined} />
          )}
          <div className="text-left">
            <p className="text-warm-900 text-sm font-medium leading-none">
              {myProfile?.displayName || username}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-warm-600 text-[10px]">
                {myProfile?.statusText || STATUS_LABEL[myProfile?.status ?? "available"]}
              </span>
              {!connected && <span className="text-warm-400 text-[10px]">· connecting</span>}
            </div>
          </div>
        </button>
        <button onClick={onLogout} className="text-warm-600 text-xs hover:text-warm-900 transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  );
}
