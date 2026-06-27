"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReactionUser {
  id: string;
  userId: string;
  emoji: string;
  createdAt?: string;
  user: { id: string; name: string; role: string };
}

interface ReactionViewerProps {
  reactions: ReactionUser[];
  onClose: () => void;
  onlineUsers?: Set<string>;
  anchorRect?: DOMRect;
}

function formatReactionTime(dateString?: string) {
  if (!dateString) return "";
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function ReactionViewer({ reactions, onClose, onlineUsers, anchorRect }: ReactionViewerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>("all");
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ReactionUser[]>();
    reactions.forEach((r) => {
      const existing = map.get(r.emoji) || [];
      existing.push(r);
      map.set(r.emoji, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [reactions]);

  const totalReactions = reactions.length;
  const uniqueEmojis = grouped.length;

  const filteredUsers = useMemo(() => {
    let users = selectedEmoji === "all"
      ? reactions
      : (grouped.find(([e]) => e === selectedEmoji)?.[1] || []);
    if (search.trim()) {
      const q = search.toLowerCase();
      users = users.filter((r) => r.user.name?.toLowerCase().includes(q));
    }
    return users;
  }, [reactions, grouped, selectedEmoji, search]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const position: React.CSSProperties = useMemo(() => {
    if (!anchorRect) return {};
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    if (spaceBelow > 350 || spaceBelow > spaceAbove) {
      return { top: anchorRect.bottom + 4, left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 340)) };
    }
    return { bottom: window.innerHeight - anchorRect.top + 4, left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 340)) };
  }, [anchorRect]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-[9999] w-[320px] rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        ...position,
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Reactions</h3>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-hover)] transition-all text-[var(--color-muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-transparent outline-none transition-colors placeholder:text-[var(--color-muted)] text-[var(--color-text)]"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>
      </div>

      {/* Emoji Tabs */}
      <div className="flex gap-0.5 px-2 pt-2 overflow-x-auto scrollbar-none border-b" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => setSelectedEmoji("all")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            selectedEmoji === "all"
              ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
              : "text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
          }`}
        >
          <span>All</span>
          <span className="tabular-nums">{totalReactions}</span>
        </button>
        {grouped.map(([emoji, users]) => (
          <button
            key={emoji}
            onClick={() => setSelectedEmoji(emoji)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              selectedEmoji === emoji
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
            }`}
          >
            <span className="text-base leading-none">{emoji}</span>
            <span className="tabular-nums">{users.length}</span>
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-6 text-sm text-[var(--color-muted)]">No users found</div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {filteredUsers.map((r) => {
              const isOnline = onlineUsers?.has(r.userId);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white">
                      {(r.user.name || "?")[0].toUpperCase()}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-online)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[var(--color-text)] truncate">{r.user.name}</span>
                      {r.user.role && r.user.role !== "client" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">{r.user.role}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">{formatReactionTime(r.createdAt)}</div>
                  </div>
                  <span className="text-lg shrink-0">{r.emoji}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
