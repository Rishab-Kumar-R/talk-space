"use client";

import { useState } from "react";
import { X, Hash, Lock, UserMinus } from "lucide-react";
import { Room } from "../../../shared/types";
import { Avatar } from "../../users/components/Avatar";
import { updateRoomDescription } from "../api";

interface Props {
  activeRoom: Room;
  roomMembers: Record<string, string>;
  username: string;
  inviteUsername: string;
  setInviteUsername: (v: string) => void;
  inviteError: string;
  setInviteError: (v: string) => void;
  inviting: boolean;
  onInvite: (e: React.FormEvent) => void;
  onKick: (targetUsername: string) => void;
  onUpdateRoom: (room: Room) => void;
  onClose: () => void;
}

export function RoomSettingsModal({
  activeRoom, roomMembers, username,
  inviteUsername, setInviteUsername,
  inviteError, setInviteError,
  inviting, onInvite, onKick, onUpdateRoom, onClose,
}: Props) {
  const [desc, setDesc] = useState(activeRoom.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);
  const isAdmin = roomMembers[username] === "admin";

  const handleClose = () => { onClose(); setInviteUsername(""); setInviteError(""); };

  async function handleSaveDesc(e: React.FormEvent) {
    e.preventDefault();
    setSavingDesc(true);
    try {
      const updated = await updateRoomDescription(activeRoom.name, desc);
      onUpdateRoom(updated);
    } finally {
      setSavingDesc(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}
      style={{ backdropFilter: "blur(12px) saturate(140%)", WebkitBackdropFilter: "blur(12px) saturate(140%)" }}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            {activeRoom.isPrivate
              ? <Lock size={13} style={{ color: "var(--accent)" }} />
              : <Hash size={14} style={{ color: "var(--accent)" }} />}
            <span className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{activeRoom.name}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md"
                  style={{ background: "var(--bg-active)", color: "var(--accent)" }}>
              {activeRoom.isPrivate ? "Private" : "Public"}
            </span>
          </div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Members list */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2"
               style={{ color: "var(--text-3)" }}>
              Members ({Object.keys(roomMembers).length})
            </p>
            <div className="rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                 style={{ border: "1px solid var(--border)" }}>
              {Object.entries(roomMembers).map(([member, role], i, arr) => (
                <div
                  key={member}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : "none",
                    background: "var(--bg-input)",
                  }}
                >
                  <Avatar name={member} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{member}</p>
                    <p className="text-[10px] capitalize" style={{ color: "var(--text-3)" }}>{role}</p>
                  </div>
                  {roomMembers[username] === "admin" && member !== username && (
                    <button
                      onClick={() => onKick(member)}
                      title="Remove member"
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                      style={{ color: "var(--text-3)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <UserMinus size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {isAdmin && (
            <form onSubmit={handleSaveDesc}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                 style={{ color: "var(--text-3)" }}>Channel description</p>
              <div className="flex gap-2">
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Short description of this channel…"
                  maxLength={120}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                />
                <button
                  type="submit"
                  disabled={savingDesc || desc === (activeRoom.description ?? "")}
                  className="rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {savingDesc ? "…" : "Save"}
                </button>
              </div>
            </form>
          )}

          {/* Invite */}
          {roomMembers[username] === "admin" && (
            <form onSubmit={onInvite}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                 style={{ color: "var(--text-3)" }}>Invite member</p>
              <div className="flex gap-2">
                <input
                  value={inviteUsername}
                  onChange={(e) => { setInviteUsername(e.target.value); setInviteError(""); }}
                  placeholder="Username"
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                />
                <button
                  type="submit"
                  disabled={inviting || !inviteUsername.trim()}
                  className="rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  {inviting ? "..." : "Invite"}
                </button>
              </div>
              {inviteError && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{inviteError}</p>}
            </form>
          )}

          {/* Leave room */}
          {roomMembers[username] && roomMembers[username] !== "admin" && (
            <button
              onClick={() => onKick(username)}
              className="w-full py-2 rounded-xl text-sm transition-colors"
              style={{ color: "var(--danger)", border: "1px solid var(--danger)", background: "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              Leave room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
