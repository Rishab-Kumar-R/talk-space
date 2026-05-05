"use client";

import { Room } from "../../../shared/types";
import { Avatar } from "../../users/components/Avatar";

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
  onClose: () => void;
}

export function RoomSettingsModal({
  activeRoom, roomMembers, username,
  inviteUsername, setInviteUsername,
  inviteError, setInviteError,
  inviting, onInvite, onKick, onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 px-4"
      onClick={() => { onClose(); setInviteUsername(""); setInviteError(""); }}
    >
      <div
        className="bg-warm-50 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-warm-900 font-semibold text-sm">
                {activeRoom.isPrivate ? "🔒" : "#"} {activeRoom.name}
              </p>
              <p className="text-warm-500 text-xs mt-0.5">
                {activeRoom.isPrivate ? "Private room" : "Public room"}
              </p>
            </div>
            <button
              onClick={() => { onClose(); setInviteUsername(""); setInviteError(""); }}
              className="text-warm-400 hover:text-warm-700 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <p className="text-warm-600 text-[10px] font-semibold uppercase tracking-widest mb-2">
            Members ({Object.keys(roomMembers).length})
          </p>
          <div className="max-h-48 overflow-y-auto mb-4 rounded-xl bg-warm-200">
            {Object.entries(roomMembers).map(([member, role]) => (
              <div key={member} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-warm-300 last:border-0">
                <Avatar name={member} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-warm-900 text-sm font-medium truncate">{member}</p>
                  <p className="text-warm-500 text-[10px] capitalize">{role}</p>
                </div>
                {roomMembers[username] === "admin" && member !== username && (
                  <button
                    onClick={() => onKick(member)}
                    className="text-warm-400 hover:text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-warm-300 transition-colors"
                    title="Remove member"
                  >
                    Remove
                  </button>
                )}
                {member === username && roomMembers[username] !== "admin" && (
                  <button
                    onClick={() => onKick(username)}
                    className="text-warm-400 hover:text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-warm-300 transition-colors"
                  >
                    Leave
                  </button>
                )}
              </div>
            ))}
          </div>

          {roomMembers[username] === "admin" && (
            <form onSubmit={onInvite} className="mb-2">
              <p className="text-warm-600 text-[10px] font-semibold uppercase tracking-widest mb-1.5">
                Invite member
              </p>
              <div className="flex gap-2">
                <input
                  value={inviteUsername}
                  onChange={(e) => { setInviteUsername(e.target.value); setInviteError(""); }}
                  placeholder="Username"
                  className="flex-1 bg-warm-200 border border-warm-300 rounded-xl px-3 py-2 text-sm text-warm-900 outline-none focus:border-warm-600 placeholder:text-warm-500"
                />
                <button
                  type="submit"
                  disabled={inviting || !inviteUsername.trim()}
                  className="bg-warm-800 text-warm-50 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-warm-900 disabled:opacity-50 transition-colors"
                >
                  {inviting ? "..." : "Invite"}
                </button>
              </div>
              {inviteError && <p className="text-red-500 text-xs mt-1">{inviteError}</p>}
            </form>
          )}

          {roomMembers[username] && roomMembers[username] !== "admin" && (
            <button
              onClick={() => onKick(username)}
              className="w-full mt-2 py-2 rounded-xl text-red-500 border border-red-300 text-sm hover:bg-red-50 transition-colors"
            >
              Leave room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
