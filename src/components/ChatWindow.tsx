"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import GroupInfo from "./GroupInfo";
import ContextMenu from "./ContextMenu";
import ImageLightbox from "./ImageLightbox";
import MessageInfoModal from "./MessageInfoModal";
import AuroraBackground from "./reactbits/AuroraBackground";
import MagneticButton from "./reactbits/MagneticButton";
import type { ContextMenuAction } from "./ContextMenu";

interface UploadedFile {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

type Message = import("@/context/SocketContext").Message;

function getConversationName(
  participants: {
    id: string;
    userId: string;
    user: { id: string; name: string; role: string };
  }[],
  userId: string,
  title: string | null,
) {
  if (title) return title;
  const others = participants.filter((p) => p.userId !== userId);
  return others.map((p) => p.user.name).join(", ") || "Unknown";
}

interface ChatWindowProps {
  onToggleSidebar?: () => void;
}

export default function ChatWindow({ onToggleSidebar }: ChatWindowProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    onlineUsers,
    isManager,
    setActiveConversation,
    markAsRead,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    sendMessage,
    emitTyping,
    emitStopTyping,
    typingUsers: contextTypingUsers,
    loadMoreMessages,
    hasMoreMessages,
    loadingMoreMessages,
  } = useChat();
  const [showInfo, setShowInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null,
  );
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [messageInfoTarget, setMessageInfoTarget] = useState<Message | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const isInitialLoadForConversation = useRef(true);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  useEffect(() => {
    if (activeConversation) {
      isInitialLoadForConversation.current = true;
      loadMoreMessages(activeConversation);
    }
  }, [activeConversation, loadMoreMessages]);

  const conversation = conversations.find((c) => c.id === activeConversation);
  const convMessages = conversation ? messages[conversation.id] || [] : [];
  const otherParticipant =
    conversation?.participants.find((p) => p.userId !== user!.id) || null;
  const convName = conversation
    ? getConversationName(
        conversation.participants,
        user!.id,
        conversation.title,
      )
    : "";
  const isOnline = otherParticipant
    ? onlineUsers.has(otherParticipant.userId)
    : false;
  const isGroup = conversation?.isGroup || false;

  const scrollToBottom = useCallback((smooth = true) => {
    if (smooth) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversation) return;
    if (
      container.scrollTop < 100 &&
      hasMoreMessages[activeConversation] &&
      !loadingMoreMessages[activeConversation]
    ) {
      const prevScrollTop = container.scrollTop;
      const prevScrollHeight = container.scrollHeight;
      loadMoreMessages(activeConversation).then(() => {
        requestAnimationFrame(() => {
          if (container)
            container.scrollTop =
              container.scrollHeight - prevScrollHeight + prevScrollTop;
        });
      });
    }
  }, [
    activeConversation,
    hasMoreMessages,
    loadingMoreMessages,
    loadMoreMessages,
  ]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (convMessages.length > 0 && messagesContainerRef.current) {
      if (isInitialLoadForConversation.current) {
        scrollToBottom(false); // Instant scroll on load
        isInitialLoadForConversation.current = false;
      } else {
        const last = convMessages[convMessages.length - 1];
        // For new messages, only scroll if the user sent it.
        if (last.senderId === user?.id) scrollToBottom(true);
      }
    }
  }, [convMessages, user?.id, scrollToBottom]);

  const audioRef = useMemo(
    () =>
      typeof Audio !== "undefined" ? new Audio("/notification.mp3") : null,
    [],
  );

  useEffect(() => {
    const lastMessage = convMessages[convMessages.length - 1];
    if (lastMessage && lastMessage.senderId !== user?.id) {
      if (document.visibilityState !== "visible")
        audioRef?.play().catch(() => {});
    }
  }, [convMessages, user?.id, audioRef]);

  const typingList = activeConversation
    ? (contextTypingUsers[activeConversation] || []).map((u) => ({
        id: u.userId,
        name: u.name,
      }))
    : [];

  useEffect(() => {
    if (!activeConversation || convMessages.length === 0) return;
    const hasUnread = convMessages.some(
      (m: any) =>
        m.senderId !== user?.id &&
        (!m.readBy || !m.readBy.some((r: any) => r.userId === user?.id)),
    );
    if (hasUnread) markAsRead(activeConversation);
  }, [activeConversation, convMessages, markAsRead, user?.id]);

  const handleSend = useCallback(
    (content: string, files?: UploadedFile[]) => {
      if (activeConversation) {
        if (editingMessage) {
          editMessage(editingMessage.id, content, activeConversation);
          setEditingMessage(null);
        } else {
          sendMessage(
            activeConversation,
            content,
            replyingTo?.id || undefined,
            files,
            replyingTo,
          );
        }
        setReplyingTo(null);
      }
    },
    [activeConversation, replyingTo, editingMessage, editMessage, sendMessage],
  );

  const handleSendFile = useCallback(
    (content: string, files: UploadedFile[]) => {
      if (activeConversation) {
        sendMessage(
          activeConversation,
          content,
          replyingTo?.id || undefined,
          files,
          replyingTo,
        );
        setReplyingTo(null);
      }
    },
    [activeConversation, replyingTo, sendMessage],
  );

  const handleContextMenu = (e: React.MouseEvent, message: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (activeConversation) addReaction(messageId, emoji, activeConversation);
    },
    [activeConversation, addReaction],
  );

  const handleRemoveReaction = useCallback(
    (messageId: string) => {
      if (activeConversation) removeReaction(messageId, activeConversation);
    },
    [activeConversation, removeReaction],
  );

  const handleScrollToMessage = useCallback((messageId: string) => {
    setHighlightMessageId(messageId);
    setTimeout(() => setHighlightMessageId(null), 2000);
  }, []);

  const handleMessageInfo = useCallback((message: Message) => {
    setMessageInfoTarget(message);
  }, []);

  const contextMenuActions: ContextMenuAction[] = contextMenu
    ? [
        {
          id: "reply",
          label: "Reply",
          icon: (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          ),
          onClick: () => setReplyingTo(contextMenu.message),
        },
        {
          id: "copy",
          label: "Copy",
          icon: (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          ),
          onClick: () =>
            navigator.clipboard.writeText(contextMenu.message.content),
        },
        // { id: "forward", label: "Forward", icon: (
        //   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        //     <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" />
        //   </svg>
        // ), onClick: () => {
        //   navigator.clipboard.writeText(contextMenu.message.content);
        // }},
        // { id: "pin", label: "Pin", icon: (
        //   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        //     <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
        //   </svg>
        // ), onClick: () => {} },
        // { id: "save", label: "Save", icon: (
        //   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        //     <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        //   </svg>
        // ), onClick: () => {} },
        // { id: "react", label: "React", icon: (
        //   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        //     <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        //   </svg>
        // ), divider: true, onClick: () => {} },
        ...(contextMenu.message.senderId === user?.id
          ? [
              {
                id: "edit",
                label: "Edit",
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ),
                onClick: () => setEditingMessage(contextMenu.message),
              },
              {
                id: "delete",
                label: "Delete for everyone",
                danger: true as const,
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                ),
                onClick: () =>
                  deleteMessage(
                    contextMenu.message.id,
                    activeConversation!,
                    true,
                  ),
              },
              {
                id: "delete-me",
                label: "Delete for me",
                danger: true as const,
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M3 12h18" />
                    <path d="M12 3v18" />
                  </svg>
                ),
                onClick: () =>
                  deleteMessage(
                    contextMenu.message.id,
                    activeConversation!,
                    false,
                  ),
              },
            ]
          : isManager
            ? [
                {
                  id: "delete",
                  label: "Delete for everyone",
                  icon: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  ),
                  danger: true as const,
                  onClick: () =>
                    deleteMessage(
                      contextMenu.message.id,
                      activeConversation!,
                      true,
                    ),
                },
              ]
            : []),
        {
          id: "message-info",
          label: "Message Info",
          icon: (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
          divider: true,
          onClick: () => handleMessageInfo(contextMenu.message),
        },
      ]
    : [];

  // Empty state
  if (!activeConversation || !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="text-center px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-active)] flex items-center justify-center mx-auto mb-6">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Company Chat
            </h2>
            <p className="text-sm text-[var(--color-muted)] max-w-xs mx-auto leading-relaxed">
              {isManager
                ? "Select a conversation or create a new one to get started."
                : "Select a conversation from the sidebar to start messaging."}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Premium Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-[var(--color-border)]"
          style={{
            background: "var(--color-header)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setActiveConversation(null)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-muted)] hover:bg-[var(--color-hover)] transition-all active:scale-90"
              aria-label="Back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isRtl ? "scale-x-[-1]" : ""}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div
              className="relative shrink-0 cursor-pointer group"
              onClick={() => setShowInfo(true)}
            >
              <div
                className="rounded-full overflow-hidden ring-2 ring-[var(--color-border)] group-hover:ring-[var(--color-primary)] transition-all duration-300"
                style={{ width: 40, height: 40 }}
              >
                {(isGroup && conversation.imageUrl) ||
                (!isGroup && otherParticipant?.user?.avatarUrl) ? (
                  <img
                    src={
                      isGroup
                        ? conversation.imageUrl!
                        : otherParticipant?.user?.avatarUrl!
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white">
                    {convName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {otherParticipant && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[var(--color-bg)] rounded-full ${isOnline ? "bg-[var(--color-online)] pulse-ring" : "bg-[var(--color-muted)]"}`}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-[var(--color-text)] truncate leading-tight">
                {convName}
              </div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">
                {otherParticipant ? (
                  isOnline ? (
                    <span className="text-[var(--color-online)] font-medium">
                      Online
                    </span>
                  ) : (
                    <span>Offline</span>
                  )
                ) : (
                  <span>{conversation.participants.length} members</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <MagneticButton strength={0.15}>
              <button
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)] transition-all active:scale-90"
                onClick={() => setShowInfo(true)}
                title="Conversation info"
                aria-label="Info"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </MagneticButton>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 scroll-smooth"
          style={{
            background: "var(--color-bg)",
            backgroundImage: `
              radial-gradient(ellipse at 20% 50%, rgba(124, 92, 255, 0.03) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(110, 231, 249, 0.02) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(139, 92, 246, 0.02) 0%, transparent 50%)
            `,
          }}
        >
          <div className="flex flex-col min-h-full">
            {convMessages.length === 0 && typingList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-active)] flex items-center justify-center mb-4 mx-auto">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="1.5"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <div className="text-sm text-[var(--color-muted)] mb-1">
                    No messages yet
                  </div>
                  <div className="text-xs text-[var(--color-muted)]/60">
                    Send a message to start the conversation
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <div className="flex-1" />
                <div className="py-4 space-y-0.5">
                  {activeConversation &&
                    loadingMoreMessages[activeConversation] && (
                      <div className="flex justify-center py-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                          <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Loading older messages...
                        </div>
                      </div>
                    )}

                  {(convMessages as any[]).map((msg: any, idx: number) => {
                    const isSent = msg.senderId === user!.id;
                    const prevMsg = convMessages[idx - 1];
                    const nextMsg = convMessages[idx + 1];
                    const showSender =
                      !isSent && prevMsg?.senderId !== msg.senderId;
                    const sameAsPrevSender =
                      !!prevMsg && prevMsg.senderId === msg.senderId;
                    const sameAsNextSender =
                      !!nextMsg && nextMsg.senderId === msg.senderId;
                    const isGroupStart =
                      !prevMsg || prevMsg.senderId !== msg.senderId;
                    const isGroupEnd =
                      !nextMsg || nextMsg.senderId !== msg.senderId;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.2,
                          ease: [0.16, 1, 0.3, 1],
                          delay: Math.min(idx * 0.005, 0.15),
                        }}
                        className={`flex items-end ${sameAsPrevSender ? "mt-0.5" : "mt-2.5"}`}
                      >
                        {/* Avatar column for received messages */}
                        {!isSent && (
                          <div className="w-[38px] shrink-0 flex items-end pb-0.5">
                            {isGroupEnd ? (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                {(msg.sender.name || "?")[0].toUpperCase()}
                              </div>
                            ) : (
                              <div className="w-7 shrink-0" />
                            )}
                          </div>
                        )}
                        <div
                          className={`min-w-0 max-w-[85%] sm:max-w-[70%] ${isSent ? "ms-auto" : ""}`}
                        >
                          <MessageBubble
                            message={msg}
                            isSent={isSent}
                            showSender={showSender}
                            isGroupStart={isGroupStart}
                            isGroupEnd={isGroupEnd}
                            hasNextFromSameSender={sameAsNextSender}
                            isGroup={isGroup}
                            onReply={(m) => setReplyingTo(m as any)}
                            onContextMenu={handleContextMenu}
                            onReact={handleReact}
                            onRemoveReaction={handleRemoveReaction}
                            currentUserId={user!.id}
                            highlight={highlightMessageId === msg.id}
                            onScrollToMessage={handleScrollToMessage}
                            onImageClick={setLightboxImage}
                            onlineUsers={onlineUsers}
                          />
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typingList.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="flex justify-start px-1"
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{
                          background: "var(--color-received)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="flex gap-1">
                          {[0, 150, 300].map((delay) => (
                            <span
                              key={delay}
                              className="w-2 h-2 rounded-full bg-[var(--color-muted)] animate-bounce"
                              style={{
                                animationDelay: `${delay}ms`,
                                animationDuration: "0.8s",
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[var(--color-muted)]">
                          {typingList.length === 1
                            ? `${typingList[0].name} is typing...`
                            : `${typingList.length} people are typing...`}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0"
          style={{
            background: "var(--color-header)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <ChatInput
            conversationId={activeConversation}
            onSend={handleSend}
            onSendFile={handleSendFile}
            onTyping={() => emitTyping(activeConversation)}
            onStopTyping={() => emitStopTyping(activeConversation)}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            participants={conversation?.participants}
            currentUserId={user?.id}
          />
        </div>
      </div>

      {showInfo && conversation && (
        <GroupInfo
          conversation={conversation}
          onClose={() => setShowInfo(false)}
        />
      )}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
      {messageInfoTarget && conversation && (
        <MessageInfoModal
          message={messageInfoTarget}
          participants={conversation.participants}
          isGroup={isGroup}
          onClose={() => setMessageInfoTarget(null)}
          onlineUsers={onlineUsers}
        />
      )}
      {contextMenu && (
        <div
          className="context-menu-backdrop"
          onClick={() => setContextMenu(null)}
        >
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenuActions}
            onClose={() => setContextMenu(null)}
            isOwn={contextMenu.message.senderId === user?.id}
          />
        </div>
      )}
    </>
  );
}
