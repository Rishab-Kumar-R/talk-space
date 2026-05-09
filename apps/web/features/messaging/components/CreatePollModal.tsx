"use client";

import { useState } from "react";
import { BarChart2, Plus, X } from "lucide-react";

interface Props {
  onCreate: (question: string, options: string[]) => void;
  onClose: () => void;
}

export function CreatePollModal({ onCreate, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, j) => (j === i ? val : o)));
  }

  function addOption() {
    if (options.length < 5) setOptions((prev) => [...prev, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, j) => j !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    onCreate(q, opts);
    onClose();
  }

  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && filledOptions.length >= 2;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "24px 28px",
        width: "100%",
        maxWidth: 440,
        boxShadow: "var(--sh-3)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={17} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Create a poll</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-faint)", padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Question
            </label>
            <input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something…"
              style={{
                padding: "9px 12px", borderRadius: 8,
                border: "1px solid var(--border-strong)",
                background: "var(--panel-2)",
                color: "var(--text)", fontSize: 14,
                outline: "none", fontFamily: "inherit",
                width: "100%",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Options
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: "2px solid var(--border-strong)",
                    flexShrink: 0,
                  }} />
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: 7,
                      border: "1px solid var(--border)",
                      background: "var(--panel-2)",
                      color: "var(--text)", fontSize: 13.5,
                      outline: "none", fontFamily: "inherit",
                    }}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{
                        background: "transparent", border: 0, cursor: "pointer",
                        color: "var(--text-faint)", padding: 4, flexShrink: 0, borderRadius: 5,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-rose)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 5 && (
              <button
                type="button"
                onClick={addOption}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "1px dashed var(--border)",
                  borderRadius: 7, padding: "7px 10px",
                  color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit", marginTop: 2,
                  transition: "border-color .15s, color .15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--accent)";
                  el.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--border)";
                  el.style.color = "var(--text-muted)";
                }}
              >
                <Plus size={13} />
                Add option
              </button>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "7px 16px", borderRadius: 7,
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canCreate}
              style={{
                padding: "7px 18px", borderRadius: 7, border: 0,
                background: canCreate ? "var(--accent)" : "var(--hover)",
                color: canCreate ? "white" : "var(--text-faint)",
                fontSize: 13, fontWeight: 600, cursor: canCreate ? "pointer" : "default",
                fontFamily: "inherit", transition: "background .15s",
              }}
            >
              Create Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
