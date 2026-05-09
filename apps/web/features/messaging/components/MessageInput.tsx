"use client";

import { useRef, useState, useEffect } from "react";
import { Paperclip, ArrowUp, Bold, Italic, Code, Code2, Link, List, AtSign, Smile, X, CornerDownLeft, Clock, BarChart2 } from "lucide-react";
import { ReplyTo, UserSummary } from "../../../shared/types";
import { applyFormat } from "../../../shared/lib/markdown";
import { searchUsers } from "../../users/api";
import { Avatar } from "../../users/components/Avatar";
import { EmojiPicker } from "../../../shared/components/EmojiPicker";
import { SchedulePickerPopover } from "../../scheduling/components/SchedulePickerPopover";
import data from "@emoji-mart/data";

interface Props {
  input: string;
  setInput: (v: string) => void;
  replyTo: ReplyTo | null;
  onClearReply: () => void;
  onSend: (e: React.FormEvent) => void;
  onCommand: (cmd: string, arg: string) => void;
  onTyping: () => void;
  uploading: boolean;
  uploadError: string;
  onFileSelect: (file: File) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  placeholder: string;
  onSchedule?: (isoString: string) => void;
  onCreatePoll?: () => void;
}

type SlashCmd = { name: string; hint: string; description: string; args: boolean };
const SLASH_COMMANDS: SlashCmd[] = [
  { name: "poll",    hint: "",           description: "Create a poll",                     args: false },
  { name: "status",  hint: "<message>",  description: "Update your status message",        args: true  },
  { name: "dm",      hint: "<username>", description: "Open a direct message",             args: true  },
];

const TOOLBAR_BTNS = [
  { icon: Bold,   title: "Bold",        prefix: "**", suffix: "**" },
  { icon: Italic, title: "Italic",      prefix: "_",  suffix: "_"  },
  { icon: Code,   title: "Inline code", prefix: "`",  suffix: "`"  },
  { icon: Link,   title: "Link",        prefix: "[",  suffix: "](url)" },
  null,
  { icon: List,   title: "List",        prefix: "- ", suffix: "" },
];

function getMentionContext(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const match = before.match(/@([a-zA-Z0-9._-]*)$/);
  if (!match) return null;
  return { start: before.length - match[0].length, query: match[1] };
}

function getEmojiContext(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const match = before.match(/:([a-zA-Z0-9_+-]{2,})$/);
  if (!match) return null;
  return { start: before.length - match[0].length, query: match[1] };
}

interface EmojiMatch { native: string; id: string; }

function searchEmojis(query: string): EmojiMatch[] {
  const q = query.toLowerCase();
  const results: EmojiMatch[] = [];
  const emojis = (data as { emojis: Record<string, { id: string; name: string; keywords: string[]; skins: { native: string }[] }> }).emojis;
  for (const [id, emoji] of Object.entries(emojis)) {
    if (id.includes(q) || emoji.name?.toLowerCase().includes(q) || emoji.keywords?.some((k) => k.includes(q))) {
      results.push({ native: emoji.skins[0].native, id });
      if (results.length >= 8) break;
    }
  }
  return results;
}

export function MessageInput({
  input, setInput, replyTo, onClearReply,
  onSend, onCommand, onTyping, uploading, uploadError,
  onFileSelect, onPaste, placeholder, onSchedule, onCreatePoll,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const smileBtnRef = useRef<HTMLButtonElement>(null);
  const [mentionCtx, setMentionCtx] = useState<{ start: number; query: string } | null>(null);
  const [suggestions, setSuggestions] = useState<UserSummary[]>([]);
  const [emojiCtx, setEmojiCtx] = useState<{ start: number; query: string } | null>(null);
  const [emojiSuggestions, setEmojiSuggestions] = useState<EmojiMatch[]>([]);
  const [slashCtx, setSlashCtx] = useState<string | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ top: 0, left: 0 });
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  useEffect(() => {
    if (!input) {
      const el = inputRef.current;
      if (el) el.style.height = "auto";
    }
  }, [input]);

  function autoResize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    onTyping();
    autoResize();
    const cursor = e.target.selectionStart ?? val.length;

    const mCtx = getMentionContext(val, cursor);
    if (mCtx && mCtx.query.length >= 1) {
      setMentionCtx(mCtx);
      searchUsers(mCtx.query).then(setSuggestions);
    } else {
      setMentionCtx(null);
      setSuggestions([]);
    }

    const eCtx = getEmojiContext(val, cursor);
    if (eCtx) {
      setEmojiCtx(eCtx);
      setEmojiSuggestions(searchEmojis(eCtx.query));
    } else {
      setEmojiCtx(null);
      setEmojiSuggestions([]);
    }

    const slashMatch = val.match(/^\/([a-zA-Z]*)$/);
    if (slashMatch !== null) {
      setSlashCtx(slashMatch[1].toLowerCase());
      setSlashIdx(0);
    } else {
      setSlashCtx(null);
    }
  }

  function selectSlashCommand(cmd: SlashCmd) {
    if (cmd.args) {
      setInput(`/${cmd.name} `);
    } else {
      // Immediate-action commands execute now, don't wait for Enter
      onCommand(cmd.name, "");
      setInput("");
    }
    setSlashCtx(null);
    setSlashIdx(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectMention(u: string) {
    if (!mentionCtx) return;
    const before = input.slice(0, mentionCtx.start);
    const after = input.slice(mentionCtx.start + 1 + mentionCtx.query.length);
    setInput(`${before}@${u} ${after}`);
    setMentionCtx(null);
    setSuggestions([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectEmojiSuggestion(native: string) {
    if (!emojiCtx) return;
    const before = input.slice(0, emojiCtx.start);
    const after = input.slice(emojiCtx.start + 1 + emojiCtx.query.length);
    setInput(`${before}${native} ${after}`);
    setEmojiCtx(null);
    setEmojiSuggestions([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleFormat(prefix: string, suffix: string) {
    const el = inputRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const result = applyFormat(value, s ?? value.length, e ?? value.length, { prefix, suffix });
    setInput(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  function handleCodeBlock() {
    const el = inputRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s ?? 0, e ?? 0);
    const before = value.slice(0, s ?? 0);
    const after = value.slice(e ?? 0);
    const block = selected
      ? `\`\`\`\n${selected}\n\`\`\``
      : "```\n\n```";
    setInput(before + block + after);
    const cursorPos = selected
      ? (before + block).length
      : before.length + 3;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? input.length;
    setInput(input.slice(0, pos) + emoji + input.slice(pos));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + emoji.length, pos + emoji.length);
    });
  }

  const filteredCmds = slashCtx !== null
    ? SLASH_COMMANDS.filter(c => c.name.startsWith(slashCtx))
    : [];

  const canSend = input.trim().length > 0 && !uploading;

  return (
    <div className="composer-wrap" onFocus={() => setToolbarVisible(true)} onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && !e.currentTarget.contains(next)) {
            setToolbarVisible(false);
            setShowEmojiPicker(false);
          }
        }}>
      {/* Emoji picker — fixed to viewport so it escapes overflow:hidden ancestors */}
      {showEmojiPicker && (
        <div style={{ position: "fixed", top: emojiPickerPos.top, left: emojiPickerPos.left, zIndex: 9999 }}>
          <EmojiPicker
            onSelect={(emoji) => { insertEmoji(emoji); setShowEmojiPicker(false); }}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Slash command palette */}
      {filteredCmds.length > 0 && (
        <div className="mb-2 rounded-xl overflow-hidden"
             style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "var(--sh-3)" }}>
          <div style={{ padding: "6px 12px 4px", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            Commands
          </div>
          {filteredCmds.map((cmd, i) => (
            <button
              key={cmd.name}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectSlashCommand(cmd); }}
              onMouseEnter={() => setSlashIdx(i)}
              className="w-full text-left px-3 py-2 flex items-center gap-3"
              style={{
                color: "var(--text)", border: 0, cursor: "pointer", fontFamily: "inherit",
                background: i === slashIdx ? "var(--hover)" : "transparent",
              }}
            >
              <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--accent)", fontWeight: 600, fontSize: "0.83rem", minWidth: 80 }}>
                /{cmd.name}{cmd.hint ? ` ${cmd.hint}` : ""}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{cmd.description}</span>
            </button>
          ))}
          <div style={{ padding: "3px 12px 6px", fontSize: 10, color: "var(--text-faint)", display: "flex", gap: 8 }}>
            <span>↑↓ navigate</span>
            <span>⏎ or Tab select</span>
            <span>Esc dismiss</span>
          </div>
        </div>
      )}

      {/* Emoji shortcode suggestions */}
      {emojiSuggestions.length > 0 && emojiCtx && (
        <div className="mb-2 rounded-xl overflow-hidden"
             style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "var(--sh-3)" }}>
          {emojiSuggestions.map((e) => (
            <button
              key={e.id}
              type="button"
              onMouseDown={(ev) => { ev.preventDefault(); selectEmojiSuggestion(e.native); }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors"
              style={{ color: "var(--text)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{e.native}</span>
              <span style={{ color: "var(--text-muted)" }}>:{e.id}:</span>
            </button>
          ))}
        </div>
      )}

      {/* Mention suggestions */}
      {suggestions.length > 0 && mentionCtx && (
        <div className="mb-2 rounded-xl overflow-hidden"
             style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "var(--sh-3)" }}>
          {suggestions.slice(0, 5).map((u) => (
            <button
              key={u.username}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectMention(u.username); }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors"
              style={{ color: "var(--text)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Avatar name={u.username} size={22} />
              <span className="font-medium">@{u.username}</span>
              {u.statusText && <span className="text-xs truncate" style={{ color: "var(--text-faint)" }}>{u.statusText}</span>}
            </button>
          ))}
        </div>
      )}

      {uploadError && (
        <p className="text-xs mb-1.5 px-1" style={{ color: "var(--danger)" }}>{uploadError}</p>
      )}

      <div className="composer">
        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-3 px-4 py-2"
               style={{ borderBottom: "1px solid var(--divider)", background: "var(--panel-2)" }}>
            <div className="flex-1 min-w-0" style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "0.5rem" }}>
              <p className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
                Replying to {replyTo.username}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{replyTo.preview}</p>
            </div>
            <button onClick={onClearReply} style={{ color: "var(--text-faint)", background: "transparent", border: 0, cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Formatting toolbar — only visible when focused */}
        {toolbarVisible && (
          <div className="composer-toolbar">
            {TOOLBAR_BTNS.map((btn, i) =>
              btn === null ? (
                <span key={i} className="sep" />
              ) : (
                <button
                  key={btn.title}
                  type="button"
                  title={btn.title}
                  className="icon-btn"
                  onMouseDown={(e) => { e.preventDefault(); handleFormat(btn.prefix, btn.suffix); }}
                >
                  <btn.icon size={14} strokeWidth={2.25} />
                </button>
              )
            )}
            <button
              type="button"
              title="Code block"
              className="icon-btn"
              onMouseDown={(e) => { e.preventDefault(); handleCodeBlock(); }}
            >
              <Code2 size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Mention"
              className="icon-btn"
              onMouseDown={(e) => { e.preventDefault(); handleFormat("@", ""); }}
            >
              <AtSign size={14} strokeWidth={2} />
            </button>
            <button
              ref={smileBtnRef}
              type="button"
              title="Emoji"
              className="icon-btn"
              onMouseDown={(e) => {
                e.preventDefault();
                if (!showEmojiPicker && smileBtnRef.current) {
                  const rect = smileBtnRef.current.getBoundingClientRect();
                  const PICKER_H = 440;
                  const PICKER_W = 352;
                  const topAbove = rect.top - PICKER_H - 8;
                  const top = topAbove >= 8 ? topAbove : rect.bottom + 8;
                  const left = Math.min(rect.left, window.innerWidth - PICKER_W - 8);
                  setEmojiPickerPos({ top, left });
                }
                setShowEmojiPicker((v) => !v);
              }}
            >
              <Smile size={14} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Input area */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onPaste={onPaste}
          placeholder={placeholder}
          className="composer-input"
          rows={1}
          onKeyDown={(e) => {
            if (filteredCmds.length > 0) {
              if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, filteredCmds.length - 1)); return; }
              if (e.key === "ArrowUp")   { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return; }
              if (e.key === "Escape")    { setSlashCtx(null); return; }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); selectSlashCommand(filteredCmds[slashIdx]); return; }
              if (e.key === "Tab")       { e.preventDefault(); selectSlashCommand(filteredCmds[slashIdx]); return; }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e as unknown as React.FormEvent);
            }
          }}
        />

        {/* Schedule picker popover */}
        {showSchedulePicker && onSchedule && (
          <div style={{ position: "relative" }}>
            <SchedulePickerPopover
              onSchedule={(iso) => { onSchedule(iso); setInput(""); }}
              onClose={() => setShowSchedulePicker(false)}
            />
          </div>
        )}

        {/* Footer */}
        <div className="composer-foot">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.zip,.docx,.xlsx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
          />
          <button type="button" title="Attach file" disabled={uploading} className="icon-btn" onClick={() => fileRef.current?.click()}>
            <Paperclip size={15} strokeWidth={1.75} />
          </button>
          {onCreatePoll && (
            <button
              type="button"
              title="Create poll"
              className="icon-btn"
              onClick={onCreatePoll}
            >
              <BarChart2 size={15} strokeWidth={1.75} />
            </button>
          )}
          {onSchedule && (
            <button
              type="button"
              title="Schedule message"
              className="icon-btn"
              onClick={() => setShowSchedulePicker((v) => !v)}
              style={showSchedulePicker ? { color: "var(--accent)" } : {}}
            >
              <Clock size={15} strokeWidth={1.75} />
            </button>
          )}
          <span className="hint" style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <CornerDownLeft size={11} strokeWidth={2} /> send
            <span style={{ margin: "0 3px", opacity: 0.4 }}>·</span>
            Shift + <CornerDownLeft size={11} strokeWidth={2} /> newline
          </span>
          <button
            type="button"
            className="send"
            onClick={(e) => onSend(e as unknown as React.FormEvent)}
            disabled={!canSend}
          >
            <ArrowUp size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
