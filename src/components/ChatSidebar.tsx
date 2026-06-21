"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/SocketContext";
import { useTheme } from "@/context/ThemeContext";
import SkyToggle from "./ui/sky-toggle";
import CreateChatModal from "./CreateChatModal";
import InviteCodeModal from "./InviteCodeModal";

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function getConversationName(
  participants: { id: string; userId: string; user: { id: string; name: string } }[],
  userId: string,
  title: string | null
) {
  if (title) return title;
  const others = participants.filter((p) => p.userId !== userId);
  return others.map((p) => p.user.name).join(", ") || "Unknown";
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
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm theme-dark:text-white text-gray-900 truncate">{user?.name}</div>
              <div className="text-xs theme-dark:text-gray-400 text-gray-500 truncate">
                {user?.role === "admin" ? "Administrator" : user?.role === "hr" ? "HR Manager" : "Employee"}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
            {!isManager && (
              <button
                className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 theme-dark:text-gray-300 text-gray-600 theme-dark:hover:bg-white/10 hover:bg-gray-200 theme-dark:hover:text-white hover:text-gray-900 transition-all duration-300 rounded-full flex items-center justify-center text-sm active:scale-[0.95]"
                style={{ width: 36, height: 36 }}
                onClick={() => router.push("/join")}
                title="Join by Code"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
              className="absolute top-1/2 -translate-y-1/2 theme-dark:text-gray-500 text-gray-400"
              style={{ left: 14, width: 14, height: 14 }}
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
              className="w-full theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 text-sm theme-dark:text-white text-gray-900 rounded-2xl transition-all duration-300 focus:outline-none focus:border-blue-500/50 focus:theme-dark:bg-white/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 theme-dark:placeholder-gray-500 placeholder-gray-400"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "10px 14px 10px 40px" }}
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="theme-dark:text-gray-400 text-gray-500">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="text-sm theme-dark:text-gray-400 text-gray-500 mb-3">No conversations yet</div>
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="theme-dark:text-gray-400 text-gray-500">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="text-sm theme-dark:text-gray-400 text-gray-500 mb-1">No conversations yet</div>
                  <div className="text-xs theme-dark:text-gray-500 text-gray-400">Ask your HR/Admin for an invitation code</div>
                </>
              )}
            </div>
          )}
          {filtered.map((conv) => {
            const name = getConversationName(conv.participants, user!.id, conv.title);
            const lastMsg = conv.messages[0];
            const unread = unreadCounts[conv.id] || 0;

            return (
              <div
                key={conv.id}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 rounded-2xl mb-0.5 ${
                  activeConversation === conv.id
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "theme-dark:hover:bg-white/5 hover:bg-gray-100 border border-transparent"
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <div className="relative shrink-0">
                  <div
                    className="rounded-full flex items-center justify-center theme-dark:text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                    style={{ width: 44, height: 44, fontSize: "1rem" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  {unread > 0 && activeConversation !== conv.id && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-pulse" />
                  )}
                  {onlineUsers.has(
                    conv.participants.find((p) => p.userId !== user!.id)?.userId || ""
                  ) && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 theme-dark:border-[#09090b] border-white rounded-full"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm theme-dark:text-white text-gray-900 truncate">{name}</div>
                  {lastMsg && (
                    <div className="text-xs theme-dark:text-gray-500 text-gray-400 truncate mt-0.5">{lastMsg.content}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {lastMsg && (
                    <div className="text-[0.6rem] theme-dark:text-gray-500 text-gray-400 whitespace-nowrap">{formatTime(lastMsg.createdAt)}</div>
                  )}
                  {unread > 0 && (
                    <div className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-blue-500 text-white text-[0.6rem] font-bold px-1.5 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-fade-in-up">
                      {unread > 99 ? "99+" : unread}
                    </div>
                  )}
                  {isManager && (
                    <button
                      className="theme-dark:text-gray-500 text-gray-400 hover:text-blue-400 transition-colors p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInviteTarget(conv.id);
                      }}
                      title="Generate invite code"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Logout footer */}
        <div className="shrink-0 border-t theme-dark:border-white/10 border-gray-200 px-4 py-3">
          <button
            onClick={logout}
            className="w-full py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {isManager && (
        <CreateChatModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      )}

      {inviteTarget && (
        <InviteCodeModal
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          conversationId={inviteTarget}
        />
      )}
    </>
  );
}
