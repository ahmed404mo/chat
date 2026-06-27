"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface User { id: string; name: string | null; role?: string; }
interface Reaction { id: string; emoji: string; userId: string; user: { id: string; name: string; role: string }; }
interface Attachment { id: string; fileName: string; fileSize: number; mimeType: string; url: string; }
interface Message {
  id: string; content: string; sender: User; senderId: string;
  createdAt: string; status?: string;
  readBy: { userId: string; user: User; readAt: string }[];
  reactions?: Reaction[]; attachments?: Attachment[]; isEdited?: boolean;
}

interface DeliveryReceipt {
  userId: string;
  user: User;
  deliveredAt?: string;
  seenAt?: string;
}

interface VoicePlayback {
  userId: string;
  user: User;
  percentage: number;
  completedAt?: string;
}

interface AttachmentAction {
  userId: string;
  user: User;
  action: "viewed" | "downloaded" | "opened";
  timestamp: string;
}

interface MessageInfoModalProps {
  message: Message;
  participants: { id: string; userId: string; user: User }[];
  isGroup: boolean;
  onClose: () => void;
  onlineUsers?: Set<string>;
}

type TabType = "delivery" | "voice" | "attachments" | "stats";

function formatTime(dateString?: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400",
  hr: "bg-blue-500/20 text-blue-400",
  manager: "bg-emerald-500/20 text-emerald-400",
};

export default function MessageInfoModal({ message, participants, isGroup, onClose, onlineUsers }: MessageInfoModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("delivery");
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const hasVoice = message.attachments?.some((a) => a.mimeType.startsWith("audio/"));
  const hasFiles = message.attachments && message.attachments.length > 0;

  // Build delivery data
  const deliveryData: DeliveryReceipt[] = useMemo(() => {
    return participants.map((p) => {
      const readEntry = message.readBy?.find((r) => r.userId === p.userId);
      return {
        userId: p.userId,
        user: p.user,
        deliveredAt: message.createdAt,
        seenAt: readEntry?.readAt,
      };
    }).filter((d) => d.userId !== message.senderId);
  }, [participants, message]);

  const seenCount = deliveryData.filter((d) => d.seenAt).length;
  const deliveredCount = deliveryData.filter((d) => d.deliveredAt).length;
  const totalCount = deliveryData.length;

  // Mock voice playback data (since we don't have real tracking yet)
  const voicePlaybackData: VoicePlayback[] = useMemo(() => {
    const listeners = participants
      .filter((p) => p.userId !== message.senderId)
      .map((p, i) => ({
        userId: p.userId,
        user: p.user,
        percentage: i === 0 ? 100 : i === 1 ? 63 : 0,
        completedAt: i === 0 ? message.createdAt : undefined,
      }));
    return listeners;
  }, [participants, message]);

  // Mock attachment action data
  const attachmentActions: AttachmentAction[] = useMemo(() => {
    const actions: AttachmentAction[] = [];
    participants
      .filter((p) => p.userId !== message.senderId)
      .forEach((p, i) => {
        if (i === 0) {
          actions.push({ userId: p.userId, user: p.user, action: "viewed", timestamp: message.createdAt });
        } else if (i === 1) {
          actions.push({ userId: p.userId, user: p.user, action: "downloaded", timestamp: message.createdAt });
        } else {
          actions.push({ userId: p.userId, user: p.user, action: "opened", timestamp: "" });
        }
      });
    return actions;
  }, [participants, message]);

  const filteredDelivery = useMemo(() => {
    if (!searchQuery.trim()) return deliveryData;
    const q = searchQuery.toLowerCase();
    return deliveryData.filter((d) => d.user.name?.toLowerCase().includes(q));
  }, [deliveryData, searchQuery]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "delivery", label: "Delivery", icon: "📨" },
    ...(hasVoice ? [{ id: "voice" as TabType, label: "Voice", icon: "🎤" }] : []),
    ...(hasFiles ? [{ id: "attachments" as TabType, label: "Files", icon: "📎" }] : []),
    ...(isGroup ? [{ id: "stats" as TabType, label: "Stats", icon: "📊" }] : []),
  ];

  return createPortal(
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(message.sender.name || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text)] truncate">Message Info</div>
                  <div className="text-xs text-[var(--color-muted)] truncate">
                    Sent {formatReactionTime(message.createdAt)}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-[var(--color-hover)] transition-all shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Tabs */}
            {tabs.length > 1 && (
              <div className="flex gap-1 px-3 pt-3 overflow-x-auto scrollbar-none border-b" style={{ borderColor: "var(--color-border)" }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      activeTab === tab.id
                        ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        : "text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* DELIVERY TAB */}
              {activeTab === "delivery" && (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search participants..."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border bg-transparent outline-none transition-colors placeholder:text-[var(--color-muted)] text-[var(--color-text)]"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                  </div>

                  {/* Delivered To */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Delivered</span>
                      <span className="text-xs text-[var(--color-muted)] tabular-nums">{deliveredCount}/{totalCount}</span>
                    </div>
                    {filteredDelivery.map((d) => (
                      <motion.div
                        key={d.userId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                      >
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white">
                            {(d.user.name || "?")[0].toUpperCase()}
                          </div>
                          {onlineUsers?.has(d.userId) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-online)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-[var(--color-text)] truncate">{d.user.name}</span>
                            {d.user.role && d.user.role !== "client" && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[d.user.role] || "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"}`}>
                                {d.user.role}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--color-muted)]">
                            Delivered {d.deliveredAt ? formatReactionTime(d.deliveredAt) : ""}
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    ))}
                  </div>

                  {/* Seen By */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Seen By</span>
                      <span className="text-xs text-[var(--color-muted)] tabular-nums">{seenCount}/{totalCount}</span>
                    </div>
                    {filteredDelivery.filter((d) => d.seenAt).length === 0 ? (
                      <div className="text-center py-4 text-sm text-[var(--color-muted)]">No one has seen this message yet</div>
                    ) : (
                      filteredDelivery.filter((d) => d.seenAt).map((d) => (
                        <motion.div
                          key={d.userId}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white">
                              {(d.user.name || "?")[0].toUpperCase()}
                            </div>
                            {onlineUsers?.has(d.userId) && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-online)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-[var(--color-text)] truncate">{d.user.name}</span>
                              {d.user.role && d.user.role !== "client" && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[d.user.role] || "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"}`}>
                                  {d.user.role}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--color-muted)]">
                              Seen at {d.seenAt ? new Date(d.seenAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : ""}
                            </div>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </motion.div>
                      ))
                    )}
                    {/* Not Seen */}
                    {filteredDelivery.filter((d) => !d.seenAt).length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-2 mt-4">
                          <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Not Seen</span>
                        </div>
                        {filteredDelivery.filter((d) => !d.seenAt).map((d) => (
                          <motion.div
                            key={d.userId}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                          >
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white">
                                {(d.user.name || "?")[0].toUpperCase()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-[var(--color-text)]">{d.user.name}</span>
                            </div>
                            <span className="text-xs text-[var(--color-muted)]">Not Seen</span>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* VOICE TAB */}
              {activeTab === "voice" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Listened By</span>
                    </div>
                    {voicePlaybackData.map((v) => {
                      const status = v.completedAt ? "Completed" : v.percentage > 0 ? "Still Listening" : "Not Played Yet";
                      const statusColor = v.completedAt ? "text-[var(--color-accent)]" : v.percentage > 0 ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]";
                      return (
                        <motion.div
                          key={v.userId}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white">
                              {(v.user.name || "?")[0].toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-[var(--color-text)] truncate">{v.user.name}</span>
                              {v.user.role && v.user.role !== "client" && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[v.user.role] || "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"}`}>
                                  {v.user.role}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {v.percentage > 0 && (
                                <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-[var(--color-border)]">
                                  <div
                                    className="h-1.5 rounded-full bg-[var(--color-primary)]"
                                    style={{ width: `${v.percentage}%` }}
                                  />
                                </div>
                              )}
                              <span className={`text-xs ${statusColor}`}>
                                {status}
                              </span>
                              {v.percentage > 0 && !v.completedAt && (
                                <span className="text-xs text-[var(--color-muted)] tabular-nums">{v.percentage}%</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ATTACHMENTS TAB */}
              {activeTab === "attachments" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Viewed By</span>
                    </div>
                    {attachmentActions.filter((a) => a.action === "viewed").length === 0 ? (
                      <div className="text-center py-4 text-sm text-[var(--color-muted)]">No views yet</div>
                    ) : (
                      attachmentActions.filter((a) => a.action === "viewed").map((a) => (
                        <motion.div
                          key={a.userId}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {(a.user.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-[var(--color-text)]">{a.user.name}</span>
                            <div className="text-xs text-[var(--color-muted)]">
                              {a.timestamp ? `Viewed ${formatReactionTime(a.timestamp)}` : "Not Opened"}
                            </div>
                          </div>
                          {a.timestamp && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                        </motion.div>
                      ))
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Downloaded By</span>
                    </div>
                    {attachmentActions.filter((a) => a.action === "downloaded").map((a) => (
                      <motion.div
                        key={a.userId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {(a.user.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[var(--color-text)]">{a.user.name}</span>
                          <div className="text-xs text-[var(--color-muted)]">{a.timestamp ? `Downloaded ${formatReactionTime(a.timestamp)}` : "Not Opened"}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      </motion.div>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Not Opened</span>
                    </div>
                    {attachmentActions.filter((a) => !a.timestamp).map((a) => (
                      <motion.div
                        key={a.userId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-hover)] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {(a.user.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[var(--color-text)]">{a.user.name}</span>
                        </div>
                        <span className="text-xs text-[var(--color-muted)]">Not Opened</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* STATS TAB (Group only) */}
              {activeTab === "stats" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 text-center border" style={{ background: "var(--color-hover)", borderColor: "var(--color-border)" }}>
                      <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{deliveredCount}/{totalCount}</div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">Delivered</div>
                    </div>
                    <div className="rounded-2xl p-4 text-center border" style={{ background: "var(--color-hover)", borderColor: "var(--color-border)" }}>
                      <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{seenCount}/{totalCount}</div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">Seen</div>
                    </div>
                    <div className="rounded-2xl p-4 text-center border" style={{ background: "var(--color-hover)", borderColor: "var(--color-border)" }}>
                      <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                        {voicePlaybackData.filter((v) => v.completedAt).length}/{voicePlaybackData.length}
                      </div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">Played</div>
                    </div>
                    <div className="rounded-2xl p-4 text-center border" style={{ background: "var(--color-hover)", borderColor: "var(--color-border)" }}>
                      <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                        {totalCount - seenCount}
                      </div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">Pending</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
