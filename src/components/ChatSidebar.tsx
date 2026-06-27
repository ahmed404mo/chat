"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/SocketContext";
import { useTheme } from "@/context/ThemeContext";
import SkyToggle from "./ui/sky-toggle";
import CreateChatModal from "./CreateChatModal";
import InviteCodeModal from "./InviteCodeModal";
import JoinChatModal from "./JoinChatModal";

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
    participants: {
      id: string;
      userId: string;
      user: { id: string; name: string; avatarUrl?: string | null };
    }[];
    title?: string | null;
  },
  userId: string,
): { src: string | null; name: string } {
  if (conv.imageUrl) {
    return { src: conv.imageUrl, name: "" };
  }
  if (!conv.isGroup) {
    const other = conv.participants.find((p) => p.userId !== userId)?.user;
    if (other?.avatarUrl) {
      return { src: other.avatarUrl, name: other.name };
    }
    return { src: null, name: other?.name || "?" };
  }
  const name = conv.title || "G";
  return { src: null, name };
}

export default function ChatSidebar() {
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

  return (
    <>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b theme-dark:border-white/10 border-gray-200">
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div
              className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 theme-dark:text-white flex items-center justify-center font-bold shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.3)] overflow-hidden"
              style={{ width: 40, height: 40, fontSize: "0.95rem" }}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm theme-dark:text-white text-gray-900 truncate">
                {user?.name}
              </div>
              <div className="text-xs theme-dark:text-gray-400 text-gray-500 truncate">
                {user?.role === "admin"
                  ? "Administrator"
                  : user?.role === "hr"
                    ? "HR Manager"
                    : "Employee"}
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {isManager && (
              <button
                className="bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all duration-300 rounded-full flex items-center justify-center text-sm shadow-[0_0_12px_rgba(99,102,241,0.25)] active:scale-[0.95]"
                style={{ width: 36, height: 36 }}
                onClick={() => setShowCreateModal(true)}
                title="New Chat"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
            {!isManager && (
              <button
                className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 theme-dark:text-gray-300 text-gray-600 theme-dark:hover:bg-white/10 hover:bg-gray-200 theme-dark:hover:text-white hover:text-gray-900 transition-all duration-300 rounded-full flex items-center justify-center text-sm active:scale-[0.95]"
                style={{ width: 36, height: 36, transform: "rotate(45deg)" }}
                onClick={() => setShowJoinModal(true)}
                title="Join by Code"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transform -rotate-45"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
                </svg>
              </button>
            )}
            <SkyToggle />
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg
              className="absolute top-1/2 -translate-y-1/2 ltr:left-3.5 rtl:right-3.5 theme-dark:text-gray-500 text-gray-400"
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
              type="text"
              className="w-full theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 text-sm theme-dark:text-white text-gray-900 rounded-2xl transition-all duration-300 focus:outline-none focus:border-blue-500/50 focus:theme-dark:bg-white/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 theme-dark:placeholder-gray-500 placeholder-gray-400 ltr:pl-10 rtl:pr-10 py-2.5 px-3.5"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 animate-fade-in-up">
              {isManager ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 theme-dark:border-white/10 border-gray-200 flex items-center justify-center mb-4">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="theme-dark:text-gray-400 text-gray-500"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="text-sm theme-dark:text-gray-400 text-gray-500 mb-3">
                    No conversations yet
                  </div>
                  <button
                    className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.98]"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create your first chat
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 theme-dark:border-white/10 border-gray-200 flex items-center justify-center mb-4">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="theme-dark:text-gray-400 text-gray-500"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="text-sm theme-dark:text-gray-400 text-gray-500 mb-1">
                    No conversations yet
                  </div>
                  <div className="text-xs theme-dark:text-gray-500 text-gray-400">
                    Ask your HR/Admin for an invitation code
                  </div>
                </>
              )}
            </div>
          )}
          {filtered.map((conv, idx) => {
            const name = getConversationName(
              conv.participants,
              user!.id,
              conv.title,
            );
            const avatarInfo = getConversationAvatar(conv, user!.id);
            const lastMsg = conv.messages[0];
            const unread = unreadCounts[conv.id] || 0;
            const otherUserId = conv.participants.find(
              (p) => p.userId !== user!.id,
            )?.userId;
            const isOtherOnline = otherUserId
              ? onlineUsers.has(otherUserId)
              : false;

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: idx * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 rounded-2xl mb-0.5 ${
                  activeConversation === conv.id
                    ? "bg-blue-500/10 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.08)]"
                    : "theme-dark:hover:bg-white/5 hover:bg-gray-100 border border-transparent"
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <div className="relative shrink-0">
                  <div
                    className="rounded-full flex items-center justify-center theme-dark:text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_8px_rgba(99,102,241,0.2)] overflow-hidden"
                    style={{ width: 44, height: 44, fontSize: "1rem" }}
                  >
                    {avatarInfo.src ? (
                      <img
                        src={avatarInfo.src}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      avatarInfo.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {conv.isGroup ? (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 border-2 theme-dark:border-[#09090b] border-white flex items-center justify-center">
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                  ) : isOtherOnline ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 theme-dark:border-[#09090b] border-white rounded-full shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3 h-3 theme-dark:bg-gray-600 bg-gray-400 border-2 theme-dark:border-[#09090b] border-white rounded-full" />
                  )}
                  {unread > 0 && activeConversation !== conv.id && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm theme-dark:text-white text-gray-900 truncate">
                    {name}
                  </div>
                  {lastMsg ? (
                    <div className="text-xs theme-dark:text-gray-500 text-gray-400 truncate mt-0.5 flex items-center gap-1">
                      {lastMsg.senderId !== user!.id && conv.isGroup && (
                        <span className="font-medium theme-dark:text-gray-400 text-gray-500">
                          {lastMsg.sender?.name}:
                        </span>
                      )}
                      {lastMsg.attachments?.length > 0
                        ? lastMsg.content || "📎 File"
                        : lastMsg.content}
                    </div>
                  ) : (
                    <div className="text-xs theme-dark:text-gray-600 text-gray-400 truncate mt-0.5">
                      {conv.isGroup ? "Group created" : "No messages yet"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {lastMsg && (
                    <div className="text-[0.6rem] theme-dark:text-gray-500 text-gray-400 whitespace-nowrap">
                      {formatTime(lastMsg.createdAt)}
                    </div>
                  )}
                  {unread > 0 && (
                    <div className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-blue-500 text-white text-[0.6rem] font-bold px-1.5 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-fade-in-up">
                      {unread > 99 ? "99+" : unread}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {isManager && (
        <CreateChatModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {inviteTarget && (
        <InviteCodeModal
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          conversationId={inviteTarget}
        />
      )}

      {!isManager && (
        <JoinChatModal
          open={showJoinModal}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </>
  );
}
