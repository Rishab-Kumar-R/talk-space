"use client";

import { useState } from "react";
import { Message } from "../../../shared/types";
import { Avatar } from "../../users/components/Avatar";
import { MarkdownContent } from "../../../shared/lib/markdown";
import { formatTime } from "../../../shared/lib/utils";

interface Props {
  rootMessage: Message;
  threadMessages: Message[];
  loading: boolean;
  username: string;
  onClose: () => void;
  onSendReply: (content: string, threadId: string) => void;
}

export function ThreadPanel({ rootMessage, threadMessages, loading, username, onClose, onSendReply }: Props) {
  const [reply, setReply] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    onSendReply(reply.trim(), rootMessage.id);
    setReply("");
  }

  return (
    <div className="w-80 shrink-0 flex flex-col border-l border-warm-300 bg-warm-50">
      <div className="px-4 py-3 border-b border-warm-300 flex items-center justify-between shrink-0">
        <span className="text-warm-900 font-semibold text-sm">Thread</span>
        <button onClick={onClose} className="text-warm-500 hover:text-warm-900 text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Root message */}
        <div className="flex gap-2.5 pb-3 border-b border-warm-200">
          <Avatar name={rootMessage.senderUsername} size={32} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-warm-900 text-sm font-semibold">{rootMessage.senderUsername}</span>
              <span className="text-warm-500 text-xs">{formatTime(rootMessage.timestamp)}</span>
            </div>
            <MarkdownContent content={rootMessage.content} />
          </div>
        </div>

        {loading && (
          <p className="text-warm-500 text-xs text-center py-2">Loading replies...</p>
        )}

        {!loading && threadMessages.length === 0 && (
          <p className="text-warm-500 text-xs text-center py-2">No replies yet. Start the thread!</p>
        )}

        {threadMessages.map((msg) => (
          <div key={msg.id} className="flex gap-2.5">
            <Avatar name={msg.senderUsername} size={28} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-warm-900 text-xs font-semibold">{msg.senderUsername}</span>
                <span className="text-warm-500 text-[10px]">{formatTime(msg.timestamp)}</span>
              </div>
              <MarkdownContent content={msg.content} />
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-warm-300 shrink-0">
        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply in thread..."
            className="flex-1 bg-warm-200 border border-warm-300 rounded-xl px-3 py-2 text-sm text-warm-900 outline-none focus:border-warm-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!reply.trim()}
            className="bg-warm-800 hover:bg-warm-900 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-xl transition-colors"
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
