"use client";

import { useRef, useEffect } from "react";
import { UserSummary } from "../../../shared/types";
import { Avatar } from "./Avatar";
import { StatusDot } from "./StatusDot";

interface Props {
  dmQuery: string;
  setDmQuery: (v: string) => void;
  dmResults: UserSummary[];
  onSelect: (username: string) => void;
  onClose: () => void;
}

export function DMSearchModal({ dmQuery, setDmQuery, dmResults, onSelect, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-warm-50 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-warm-300">
          <p className="text-warm-900 font-semibold text-sm mb-3">New Direct Message</p>
          <input
            ref={inputRef}
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
              onClick={() => onSelect(user.username)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-200 transition-colors"
            >
              <div className="relative shrink-0">
                <Avatar name={user.username} size={34} />
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={user.status ?? "available"} size={10} />
                </span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-warm-900 text-sm font-medium">{user.username}</p>
                {user.statusText && (
                  <p className="text-warm-500 text-xs truncate">{user.statusText}</p>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-warm-300">
          <button
            onClick={onClose}
            className="w-full text-warm-600 text-sm hover:text-warm-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
