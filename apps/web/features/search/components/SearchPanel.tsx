"use client";

import { RefObject } from "react";
import { Message } from "../../../shared/types";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchResults: Message[];
  searching: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
}

export function SearchPanel({ searchQuery, setSearchQuery, searchResults, searching, searchInputRef, onClose }: Props) {
  return (
    <div className="border-b border-warm-300 bg-warm-50 shrink-0">
      <div className="px-5 py-3 flex items-center gap-2">
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          placeholder="Search messages in this room..."
          className="flex-1 bg-warm-200 border border-warm-300 rounded-xl px-4 py-2.5 text-sm text-warm-900 outline-none focus:border-warm-600 placeholder:text-warm-500"
        />
        <button onClick={onClose} className="text-warm-500 hover:text-warm-900 text-lg leading-none px-1">×</button>
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
  );
}
