"use client";

import { useEffect, useState } from "react";
import {
  Hash, Lock, Plus, X, Search, ChevronDown, LogOut,
  Sun, Moon, PenSquare,
} from "lucide-react";
import { Room, UserProfile } from "../../../shared/types";
import { isDM, dmPartner } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { STATUS_LABEL } from "../../users/components/StatusDot";
import { useTheme } from "../../../shared/hooks/useTheme";

export type Section = "rooms" | "dms" | "browse";

interface Props {
  section: Section;
  onSectionChange: (s: Section) => void;
  rooms: Room[];
  activeRoom: Room | null;
  activeDMs: string[];
  username: string;
  myProfile: UserProfile | null;
  connected: boolean;
  unreadCounts: Record<string, number>;
  mentionCounts: Record<string, number>;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  newRoomPrivate: boolean;
  setNewRoomPrivate: (v: boolean) => void;
  showCreateRoom: boolean;
  setShowCreateRoom: (v: boolean) => void;
  createError: string;
  setCreateError: (v: string) => void;
  onCreateRoom: (e: React.FormEvent) => void;
  onRoomSelect: (room: Room) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onNewDM: () => void;
  onOpenSearch: () => void;
  onlineGlobal: string[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar(props: Props) {
  const {
    rooms, activeRoom, activeDMs, username, myProfile, connected,
    unreadCounts, mentionCounts, onlineGlobal, newRoomName, setNewRoomName, newRoomPrivate, setNewRoomPrivate,
    showCreateRoom, setShowCreateRoom, createError, setCreateError,
    onCreateRoom, onRoomSelect, onOpenProfile, onLogout, onNewDM, onOpenSearch,
    open, onClose,
  } = props;

  const { theme, toggleTheme } = useTheme();
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const channelRooms = rooms.filter((r) => !isDM(r.name));

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      )}

      <aside className={`
        n-sidebar
        fixed lg:relative inset-y-0 left-0 z-40 h-full
        transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>

        {/* ── Workspace title ─────────────────────────── */}
        <div className="n-ws-row">
          <button className="n-ws-name" onClick={onOpenProfile}>
            <div className="n-ws-avatar">TS</div>
            <span>TalkSpace</span>
          </button>
          <div className="n-ws-actions">
            <button className="n-action-btn" title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="n-action-btn" title="New channel" onClick={() => setShowCreateRoom(true)}>
              <PenSquare size={15} />
            </button>
            <button className="n-action-btn lg:hidden" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Search ──────────────────────────────────── */}
        <button className="n-search" onClick={onOpenSearch}>
          <Search size={13} />
          <span>Search</span>
          <span className="n-kbd">⌘K</span>
        </button>


        {/* ── Scrollable tree ──────────────────────────── */}
        <div className="n-tree">

          {/* Channels */}
          <div className="n-section">
            <div className="n-section-header">
              <button className="n-section-toggle" onClick={() => setChannelsOpen(!channelsOpen)}>
                <ChevronDown size={11} style={{ opacity: 0.4, transition: "transform .15s", transform: channelsOpen ? "rotate(0)" : "rotate(-90deg)" }} />
                <span>Channels</span>
              </button>
              <button className="n-section-add" title="New channel" onClick={() => setShowCreateRoom(true)}>
                <Plus size={13} />
              </button>
            </div>

            {channelsOpen && (
              <>
                {channelRooms.map((room) => {
                  const unread = unreadCounts[room.name] ?? 0;
                  const mentions = mentionCounts[room.name] ?? 0;
                  const active = activeRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      className={`n-item${active ? " active" : ""}${unread > 0 && !active ? " unread" : ""}`}
                      onClick={() => { onRoomSelect(room); onClose(); }}
                    >
                      <span className="n-item-icon">{room.isPrivate ? <Lock size={12} /> : <Hash size={12} />}</span>
                      <span className="n-item-label">{room.name}</span>
                      {mentions > 0 && !active && <span className="n-badge mention-badge">@{mentions}</span>}
                      {unread > 0 && !active && mentions === 0 && <span className="n-badge">{unread > 99 ? "99+" : unread}</span>}
                    </button>
                  );
                })}

                {channelRooms.length === 0 && !showCreateRoom && (
                  <p className="n-empty">No channels yet</p>
                )}
              </>
            )}
          </div>

          {/* Direct Messages */}
          <div className="n-section">
            <div className="n-section-header">
              <button className="n-section-toggle" onClick={() => setDmsOpen(!dmsOpen)}>
                <ChevronDown size={11} style={{ opacity: 0.4, transition: "transform .15s", transform: dmsOpen ? "rotate(0)" : "rotate(-90deg)" }} />
                <span>Direct messages</span>
              </button>
              <button className="n-section-add" title="New message" onClick={onNewDM}>
                <Plus size={13} />
              </button>
            </div>

            {dmsOpen && (
              <>
                {activeDMs.map((dmId) => {
                  const partner = dmPartner(dmId, username);
                  const active = activeRoom?.name === dmId;
                  const unread = unreadCounts[dmId] ?? 0;
                  const mentions = mentionCounts[dmId] ?? 0;
                  const isOnline = onlineGlobal.includes(partner);
                  return (
                    <button
                      key={dmId}
                      className={`n-item${active ? " active" : ""}${unread > 0 && !active ? " unread" : ""}`}
                      onClick={() => {
                        onRoomSelect({ id: dmId, name: dmId, createdBy: "", createdAt: "" });
                        onClose();
                      }}
                    >
                      <span className="n-item-icon" style={{ position: "relative" }}>
                        <Avatar name={partner} size={14} style={{ borderRadius: "50%" }} />
                        {isOnline && (
                          <span style={{
                            position: "absolute", bottom: -1, right: -1,
                            width: 7, height: 7, borderRadius: "50%",
                            background: "#22c55e",
                            border: "1.5px solid var(--bg-sidebar)",
                          }} />
                        )}
                      </span>
                      <span className="n-item-label">{partner}</span>
                      {mentions > 0 && !active && <span className="n-badge mention-badge">@{mentions}</span>}
                      {unread > 0 && !active && mentions === 0 && <span className="n-badge">{unread}</span>}
                    </button>
                  );
                })}

                {activeDMs.length === 0 && (
                  <p className="n-empty">No conversations yet</p>
                )}
              </>
            )}
          </div>

        </div>

        {/* ── User footer ──────────────────────────────── */}
        <div className="n-footer">
          <button className="n-user-btn" onClick={onOpenProfile}>
            {username && <Avatar name={username} size={22} color={myProfile?.avatarColor ?? undefined} style={{ borderRadius: 5, flexShrink: 0 }} />}
            <div className="n-user-info">
              <span className="n-user-name">{myProfile?.displayName || username}</span>
              <span className="n-user-status">
                {!connected ? "connecting…" : (myProfile?.statusText || STATUS_LABEL[myProfile?.status ?? "available"])}
              </span>
            </div>
          </button>
          <button className="n-action-btn" onClick={onLogout} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>

      </aside>
    </>
  );
}
