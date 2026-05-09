"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import { Message } from "../../../shared/types";
import { voteOnPoll } from "../api";

interface Props {
  msg: Message;
  username: string;
  onVoted: (updated: Message) => void;
}

export function PollMessage({ msg, username, onVoted }: Props) {
  const [voting, setVoting] = useState(false);

  const options = msg.pollOptions ?? [];
  const votes = msg.pollVotes ?? {};
  const myVote = votes[username] ?? -1;
  const hasVoted = myVote !== -1;
  const totalVotes = Object.keys(votes).length;

  const optionCounts = options.map((_, i) =>
    Object.values(votes).filter((v) => v === i).length,
  );

  async function handleVote(idx: number) {
    if (voting) return;
    setVoting(true);
    try {
      const updated = await voteOnPoll(msg.id, idx);
      onVoted(updated);
    } catch {
      // ignore
    } finally {
      setVoting(false);
    }
  }

  return (
    <div style={{
      marginTop: 4,
      background: "var(--panel-2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 14px",
      maxWidth: 360,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <BarChart2 size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{msg.content}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt, i) => {
          const count = optionCounts[i];
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === i;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voting}
              style={{
                position: "relative",
                width: "100%",
                padding: "8px 10px",
                borderRadius: 7,
                border: `1.5px solid ${isMyVote ? "var(--accent)" : "var(--border)"}`,
                background: "transparent",
                cursor: voting ? "default" : "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                overflow: "hidden",
                transition: "border-color .15s",
              }}
            >
              {totalVotes > 0 && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  width: `${pct}%`,
                  background: isMyVote ? "var(--accent)" : "var(--hover)",
                  opacity: isMyVote ? 0.15 : 1,
                  transition: "width .4s ease",
                  borderRadius: 6,
                }} />
              )}

              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isMyVote ? "var(--accent)" : "var(--border-strong)"}`,
                    background: isMyVote ? "var(--accent)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isMyVote && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "white" }} />}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: isMyVote ? "var(--accent)" : "var(--text)",
                    fontWeight: isMyVote ? 600 : 400,
                  }}>
                    {opt}
                  </span>
                </div>
                {totalVotes > 0 && (
                  <span style={{ fontSize: 11.5, color: isMyVote ? "var(--accent)" : "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {pct}% · {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
        {totalVotes === 0 ? "No votes yet — be the first!" : `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`}
        {hasVoted && " · click to change"}
      </p>
    </div>
  );
}
