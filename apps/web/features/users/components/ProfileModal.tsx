"use client";

import { UserStatus } from "../../../shared/types";
import { PROFILE_COLORS } from "../../../shared/lib/utils";
import { Avatar } from "./Avatar";
import { StatusDot, STATUS_LABEL } from "./StatusDot";

interface Props {
  username: string;
  editDisplayName: string;
  setEditDisplayName: (v: string) => void;
  editAvatarColor: string;
  setEditAvatarColor: (v: string) => void;
  editShowReceipts: boolean;
  setEditShowReceipts: (v: boolean) => void;
  editStatus: UserStatus;
  setEditStatus: (v: UserStatus) => void;
  editStatusText: string;
  setEditStatusText: (v: string) => void;
  savingProfile: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ProfileModal({
  username,
  editDisplayName, setEditDisplayName,
  editAvatarColor, setEditAvatarColor,
  editShowReceipts, setEditShowReceipts,
  editStatus, setEditStatus,
  editStatusText, setEditStatusText,
  savingProfile,
  onSave,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-warm-50 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-warm-900 font-semibold text-sm mb-4">Edit Profile</p>

          <div className="flex justify-center mb-4">
            <Avatar name={username} size={64} color={editAvatarColor} />
          </div>

          <form onSubmit={onSave} className="flex flex-col gap-4">
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
                Status
              </label>
              <div className="flex gap-2 mb-2">
                {(["available", "away", "dnd"] as UserStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditStatus(s)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                      editStatus === s
                        ? "border-warm-700 bg-warm-200 text-warm-900"
                        : "border-warm-300 text-warm-600 hover:border-warm-500"
                    }`}
                  >
                    <StatusDot status={s} size={8} />
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <input
                value={editStatusText}
                onChange={(e) => setEditStatusText(e.target.value)}
                placeholder="What's your status? (optional)"
                maxLength={80}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-2 text-sm text-warm-900 outline-none focus:border-warm-600 placeholder:text-warm-500"
              />
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

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-warm-800 text-sm font-medium">Read Receipts</p>
                <p className="text-warm-500 text-xs">Let others see when you&apos;ve read their messages</p>
              </div>
              <button
                type="button"
                onClick={() => setEditShowReceipts(!editShowReceipts)}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                  editShowReceipts ? "bg-warm-800" : "bg-warm-400"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    editShowReceipts ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
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
                onClick={onClose}
                className="flex-1 bg-warm-200 text-warm-700 rounded-xl py-2.5 text-sm font-medium hover:bg-warm-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
