"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/SocketContext";
import { useTheme } from "@/context/ThemeContext";
import SkyToggle from "./ui/sky-toggle";
import CreateChatModal from "./CreateChatModal";
import InviteCodeModal from "./InviteCodeModal";
import JoinChatModal from "./JoinChatModal";
import SpotlightCard from "./reactbits/SpotlightCard";
import MagneticButton from "./reactbits/MagneticButton";

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function getConversationName(
  participants: {
    id: string;
    userId: string;
    user: { id: string; name: string; avatarUrl?: string | null };
  }[],
  userId: string,
  title: string | null,
) {
  if (title) return title;
  const others = participants.filter((p) => p.userId !== userId);
  return others.map((p) => p.user.name).join(", ") || "Unknown";
}

function getConversationAvatar(
  conv: {
    imageUrl?: string | null;
    isGroup: boolean;
    participants: { id: string; userId: string; user: { id: string; name: string; avatarUrl?: string | null } }[];
    title?: string | null;
  },
  userId: string,
): { src: string | null; name: string } {
  if (conv.imageUrl) return { src: conv.imageUrl, name: "" };
  if (!conv.isGroup) {
    const other = conv.participants.find((p) => p.userId !== userId)?.user;
    if (other?.avatarUrl) return { src: other.avatarUrl, name: other.name };
    return { src: null, name: other?.name || "?" };
  }
  const name = conv.title || "G";
  return { src: null, name };
}

interface ChatSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ChatSidebar({ collapsed = false, onToggleCollapse }: ChatSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    onlineUsers,
    unreadCounts,
    isManager,
  } = useChat();
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const name = getConversationName(c.participants, user!.id, c.title);
      return name.toLowerCase().includes(q);
    });
  }, [conversations, search, user]);

  const toggleSearch = () => {
    if (collapsed) {
      onToggleCollapse?.();
      setTimeout(() => searchRef.current?.focus(), 350);
    } else {
      searchRef.current?.focus();
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--color-border)] shrink-0">
          <motion.button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-3 flex-1 min-w-0 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative shrink-0">
              <div
                className="rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden ring-2 ring-[var(--color-border)] group-hover:ring-[var(--color-primary)] transition-all duration-300"
                style={{ width: collapsed ? 40 : 40, height: collapsed ? 40 : 40, fontSize: "0.9rem" }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white w-full h-full flex items-center justify-center">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--color-online)] border-2 border-[var(--color-sidebar)] rounded-full pulse-ring" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="min-w-0 overflow-hidden"
                >
                  <div className="font-semibold text-sm text-[var(--color-text)] truncate leading-tight">
                    {user?.name}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] truncate mt-0.5">
                    {user?.role === "admin" ? "Administrator" : user?.role === "hr" ? "HR Manager" : user?.role === "employee" ? "Employee" : "Client"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <div className="flex items-center gap-1">
            {isManager && (
              <MagneticButton strength={0.2}>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-all duration-200 active:scale-90"
                  onClick={() => setShowCreateModal(true)}
                  title="New Chat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </MagneticButton>
            )}
            {!isManager && (
              <MagneticButton strength={0.2}>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-all duration-200 active:scale-90"
                  onClick={() => setShowJoinModal(true)}
                  title="Join by Code"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
                  </svg>
                </button>
              </MagneticButton>
            )}
            <MagneticButton strength={0.2}>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-all duration-200 active:scale-90"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={collapsed ? "ltr:rotate-180 rtl:rotate-180" : ""}>
                  <polyline points={isRtl ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
                </svg>
              </button>
            </MagneticButton>
          </div>
        </div>

        {/* Search */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pt-3 pb-1 overflow-hidden"
            >
              <div className="relative">
                <svg
                  className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"} text-[var(--color-muted)]`}
                  style={{ width: 14, height: 14 }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  className={`w-full bg-[var(--color-input)] border border-[var(--color-border)] text-sm text-[var(--color-text)] rounded-xl transition-all duration-300 focus:outline-none focus:border-[var(--color-primary)]/50 placeholder-[var(--color-muted)] ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5`}
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scroll-smooth">
          {filtered.length === 0 && !collapsed && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-active)] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="text-sm text-[var(--color-muted)] mb-1">No conversations yet</div>
            </div>
          )}
          {filtered.map((conv, idx) => {
            const name = getConversationName(conv.participants, user!.id, conv.title);
            const avatarInfo = getConversationAvatar(conv, user!.id);
            const lastMsg = conv.messages[0];
            const unread = unreadCounts[conv.id] || 0;
            const otherUserId = conv.participants.find((p) => p.userId !== user!.id)?.userId;
            const isOtherOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
            const isActive = activeConversation === conv.id;

            return (
              <SpotlightCard key={conv.id} spotlightColor="rgba(124, 92, 255, 0.04)">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all duration-200 sidebar-item ${isActive ? "active" : ""}`}
                  onClick={() => setActiveConversation(conv.id)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative shrink-0">
                    <div
                      className="rounded-full flex items-center justify-center font-bold overflow-hidden"
                      style={{ width: collapsed ? 42 : 44, height: collapsed ? 42 : 44, fontSize: "1rem" }}
                    >
                      {avatarInfo.src ? (
                        <img src={avatarInfo.src} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white w-full h-full flex items-center justify-center">
                          {avatarInfo.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {conv.isGroup ? (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] border-2 border-[var(--color-sidebar)] flex items-center justify-center">
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                    ) : isOtherOnline ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-online)] border-2 border-[var(--color-sidebar)] rounded-full" />
                    ) : null}
                    {unread > 0 && !isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_rgba(124,92,255,0.6)]" />
                    )}
                  </div>

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex-1 min-w-0 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm text-[var(--color-text)] truncate leading-tight flex-1 min-w-0">
                            {name}
                          </div>
                          {lastMsg && (
                            <div className="text-[0.6rem] text-[var(--color-muted)] whitespace-nowrap ml-2 shrink-0">
                              {formatTime(lastMsg.createdAt)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {lastMsg ? (
                            <div className="text-xs text-[var(--color-muted)] truncate flex-1 min-w-0">
                              {lastMsg.senderId !== user!.id && conv.isGroup && (
                                <span className="font-medium text-[var(--color-text)]/70">{lastMsg.sender?.name}: </span>
                              )}
                              {lastMsg.attachments?.length > 0
                                ? lastMsg.content || "📎 File"
                                : lastMsg.content}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--color-muted)] truncate">
                              {conv.isGroup ? "Group created" : "No messages yet"}
                            </div>
                          )}
                          {unread > 0 && (
                            <div className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-[0.6rem] font-bold px-1.5 shrink-0 ml-1"
                              style={{ background: "var(--color-primary)", color: "white" }}>
                              {unread > 99 ? "99+" : unread}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      {isManager && <CreateChatModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />}
      {inviteTarget && (
        <InviteCodeModal open={!!inviteTarget} onClose={() => setInviteTarget(null)} conversationId={inviteTarget} />
      )}
      {!isManager && <JoinChatModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />}
    </>
  );
}
