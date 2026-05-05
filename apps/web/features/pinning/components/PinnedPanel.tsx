"use client";

import { Message } from "../../../shared/types";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { FileMessage } from "../../messaging/components/FileMessage";

interface Props {
  pinnedMessages: Message[];
  onUnpin: (messageId: string) => void;
  onClose: () => void;
}

export function PinnedPanel({ pinnedMessages, onUnpin, onClose }: Props) {
  return (
    <div className="border-b border-warm-300 bg-warm-50 shrink-0 max-h-72 overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-warm-200">
        <p className="text-warm-700 text-xs font-semibold uppercase tracking-wide">
          📌 Pinned Messages ({pinnedMessages.length}/5)
        </p>
        <button onClick={onClose} className="text-warm-500 hover:text-warm-900 text-lg leading-none">×</button>
      </div>
      {pinnedMessages.length === 0 && (
        <p className="text-warm-500 text-xs text-center py-5">No pinned messages yet</p>
      )}
      {pinnedMessages.map((msg) => (
        <div key={msg.id} className="flex items-start gap-3 px-5 py-3 border-b border-warm-200 last:border-0 hover:bg-warm-100 group">
          <Avatar name={msg.senderUsername} size={28} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-warm-900 text-xs font-semibold">{msg.senderUsername}</span>
              <span className="text-warm-500 text-[10px]">{formatTime(msg.timestamp)}</span>
            </div>
            {msg.messageType === "image" || msg.messageType === "file"
              ? <FileMessage msg={msg} />
              : <p className="text-warm-700 text-xs line-clamp-2">{msg.content}</p>
            }
          </div>
          <button
            onClick={() => onUnpin(msg.id)}
            className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-red-500 text-xs px-1.5 py-1 rounded transition-all shrink-0"
            title="Unpin"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
