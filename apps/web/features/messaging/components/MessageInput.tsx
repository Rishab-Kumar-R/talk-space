"use client";

import { useRef } from "react";
import { ReplyTo } from "../../../shared/types";
import { applyFormat } from "../../../shared/lib/markdown";

interface Props {
  input: string;
  setInput: (v: string) => void;
  replyTo: ReplyTo | null;
  onClearReply: () => void;
  onSend: (e: React.FormEvent) => void;
  onTyping: () => void;
  uploading: boolean;
  uploadError: string;
  onFileSelect: (file: File) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  placeholder: string;
}

const FORMAT_BUTTONS = [
  { label: "B", title: "Bold", prefix: "**", suffix: "**", cls: "font-bold" },
  { label: "I", title: "Italic", prefix: "_", suffix: "_", cls: "italic" },
  { label: "`", title: "Inline code", prefix: "`", suffix: "`", cls: "font-mono" },
  { label: "```", title: "Code block", prefix: "```\n", suffix: "\n```", cls: "font-mono text-[10px]" },
];

export function MessageInput({
  input, setInput,
  replyTo, onClearReply,
  onSend, onTyping,
  uploading, uploadError,
  onFileSelect, onPaste,
  placeholder,
}: Props) {
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFormat(prefix: string, suffix: string) {
    const el = messageInputRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const result = applyFormat(value, s ?? value.length, e ?? value.length, { prefix, suffix });
    setInput(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  return (
    <div className="px-5 pb-6 pt-3 bg-warm-100 border-t border-warm-300 shrink-0">
      <div className="flex items-center gap-1 mb-2 px-1">
        {FORMAT_BUTTONS.map(({ label, title, prefix, suffix, cls }) => (
          <button
            key={title}
            type="button"
            title={title}
            onMouseDown={(e) => { e.preventDefault(); handleFormat(prefix, suffix); }}
            className={`px-2 py-1 rounded-lg text-xs text-warm-600 hover:text-warm-900 hover:bg-warm-200 transition-colors ${cls}`}
          >
            {label}
          </button>
        ))}
      </div>

      {uploadError && <p className="text-red-500 text-xs px-1 mb-1">{uploadError}</p>}

      {replyTo && (
        <div className="flex items-center gap-3 px-0 py-2 mb-1">
          <div className="border-l-2 border-warm-700 pl-2.5 flex-1 min-w-0">
            <p className="text-warm-800 text-xs font-semibold">Replying to {replyTo.username}</p>
            <p className="text-warm-600 text-xs truncate">{replyTo.preview}</p>
          </div>
          <button onClick={onClearReply} className="text-warm-500 hover:text-warm-900 text-lg leading-none">×</button>
        </div>
      )}

      <form onSubmit={onSend}>
        <div className="flex items-center gap-3 bg-white border border-warm-300 rounded-2xl px-4 py-3 focus-within:border-warm-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.zip,.docx,.xlsx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
          />
          <button
            type="button"
            title="Attach file"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-warm-500 hover:text-warm-800 transition-colors text-base disabled:opacity-40 shrink-0"
          >
            {uploading ? "⏳" : "📎"}
          </button>
          <input
            ref={messageInputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); onTyping(); }}
            onPaste={onPaste}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-warm-900 text-sm outline-none placeholder:text-warm-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || uploading}
            className={`text-sm font-semibold px-4 py-1.5 rounded-xl transition-all ${
              input.trim() && !uploading
                ? "bg-warm-800 text-warm-50 hover:bg-warm-900"
                : "bg-warm-200 text-warm-500 cursor-default"
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
