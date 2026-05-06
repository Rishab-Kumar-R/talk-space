"use client";

import { Message, ReadReceipt } from "../../../shared/types";
import { formatTime, EMOJI_OPTIONS } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { FileMessage } from "./FileMessage";
import { MarkdownContent } from "../../../shared/lib/markdown";

interface Props {
  msg: Message;
  display: Message;
  username: string;
  editingId: string | null;
  editDraft: string;
  setEditDraft: (v: string) => void;
  emojiPickerFor: string | null;
  setEmojiPickerFor: (id: string | null) => void;
  currentIsDM: boolean;
  pinnedIds: string[];
  receipts: Record<string, ReadReceipt[]>;
  showReadReceipts: boolean;
  onReply: (msg: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onStartEdit: (msg: Message) => void;
  onSubmitEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onDelete: (messageId: string) => void;
  onPin: (msg: Message) => void;
  onUnpin: (messageId: string) => void;
  onFetchReceipts: (messageId: string) => void;
  onOpenThread: (msg: Message) => void;
}

export function MessageItem({
  msg, display, username,
  editingId, editDraft, setEditDraft,
  emojiPickerFor, setEmojiPickerFor,
  currentIsDM, pinnedIds, receipts, showReadReceipts,
  onReply, onReaction, onStartEdit, onSubmitEdit, onCancelEdit,
  onDelete, onPin, onUnpin, onFetchReceipts, onOpenThread,
}: Props) {
  const reactionEntries = Object.entries(display.reactions ?? {});

  return (
    <div key={msg.id} data-message-id={msg.id} className="flex gap-3 py-2 group relative">
      <Avatar name={display.senderUsername} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-warm-900 text-sm font-semibold">{display.senderUsername}</span>
          <span className="text-warm-500 text-xs">{formatTime(display.timestamp)}</span>
        </div>

        {display.replyToId && display.replyPreview && (
          <div className="border-l-2 border-warm-500 pl-2.5 mb-1.5 py-0.5 bg-warm-200 rounded-r-md">
            <p className="text-warm-600 text-xs truncate">{display.replyPreview}</p>
          </div>
        )}

        {display.messageType === "image" || display.messageType === "file" ? (
          <FileMessage msg={display} />
        ) : editingId === msg.id ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmitEdit(msg.id); }}
            className="flex items-center gap-2 mt-1"
          >
            <input
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") onCancelEdit(); }}
              className="flex-1 bg-warm-200 border border-warm-400 rounded-xl px-3 py-1.5 text-sm text-warm-900 outline-none focus:border-warm-700"
            />
            <button type="submit" className="text-xs font-semibold text-warm-900 bg-warm-300 hover:bg-warm-400 px-2.5 py-1.5 rounded-lg transition-colors">Save</button>
            <button type="button" onClick={onCancelEdit} className="text-xs text-warm-600 hover:text-warm-900 px-2 py-1.5 rounded-lg transition-colors">Cancel</button>
          </form>
        ) : (
          <MarkdownContent content={display.content} />
        )}

        {display.editedAt && editingId !== msg.id && (
          <span className="text-warm-500 text-[10px]">edited</span>
        )}

        {display.senderUsername === username && showReadReceipts && receipts[msg.id]?.length > 0 && (
          <div
            className="flex items-center gap-1 mt-0.5 cursor-pointer"
            onClick={() => onFetchReceipts(msg.id)}
          >
            <span className="text-warm-500 text-[10px]">Seen by</span>
            <div className="flex -space-x-1">
              {receipts[msg.id].slice(0, 3).map((r) => (
                <div key={r.username} title={r.username} className="ring-1 ring-warm-100 rounded-full">
                  <Avatar name={r.username} size={14} />
                </div>
              ))}
            </div>
            {receipts[msg.id].length > 3 && (
              <span className="text-warm-500 text-[10px]">+{receipts[msg.id].length - 3}</span>
            )}
          </div>
        )}

        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); onReaction(msg.id, emoji); }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
                  ${users.includes(username)
                    ? "bg-warm-300 border-warm-600 text-warm-900"
                    : "bg-warm-50 border-warm-300 text-warm-700 hover:border-warm-500"
                  }`}
              >
                {emoji} <span className="font-medium">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {!currentIsDM && (display.threadCount ?? 0) > 0 && (
          <button
            onClick={() => onOpenThread(display)}
            className="flex items-center gap-1 mt-1.5 text-xs text-warm-600 hover:text-warm-900 hover:underline transition-colors"
          >
            <span>💬</span>
            <span className="font-medium">{display.threadCount} {display.threadCount === 1 ? "reply" : "replies"}</span>
          </button>
        )}
      </div>

      <div
        className={`flex items-start gap-0.5 shrink-0 transition-opacity ${
          emojiPickerFor === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {emojiPickerFor === msg.id ? (
          <div className="flex gap-0.5 bg-white border border-warm-300 rounded-xl px-2 py-1.5 shadow-sm">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReaction(msg.id, emoji); setEmojiPickerFor(null); }}
                className="hover:scale-125 transition-transform text-base leading-none p-0.5"
              >
                {emoji}
              </button>
            ))}
            <button onClick={() => setEmojiPickerFor(null)} className="text-warm-400 hover:text-warm-700 text-xs ml-1 self-center">✕</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onReply(display)}
              className="text-warm-500 hover:text-warm-800 text-sm px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
              title="Reply"
            >
              ↩
            </button>
            {!currentIsDM && (
              <button
                onClick={() => onOpenThread(display)}
                className="text-warm-500 hover:text-warm-800 text-sm px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
                title="Open thread"
              >
                💬
              </button>
            )}
            <button
              onClick={() => setEmojiPickerFor(msg.id)}
              className="text-warm-500 hover:text-warm-800 text-sm px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
              title="React"
            >
              😊
            </button>
            {display.senderUsername === username && (
              <>
                <button
                  onClick={() => onStartEdit(display)}
                  className="text-warm-500 hover:text-warm-800 text-xs px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  className="text-warm-500 hover:text-red-600 text-xs px-1.5 py-1 rounded hover:bg-warm-200 transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </>
            )}
            {!currentIsDM && (
              <button
                onClick={() => pinnedIds.includes(msg.id) ? onUnpin(msg.id) : onPin(display)}
                className={`text-xs px-1.5 py-1 rounded hover:bg-warm-200 transition-colors ${
                  pinnedIds.includes(msg.id) ? "text-warm-800" : "text-warm-400 hover:text-warm-800"
                }`}
                title={pinnedIds.includes(msg.id) ? "Unpin" : "Pin message"}
              >
                📌
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
