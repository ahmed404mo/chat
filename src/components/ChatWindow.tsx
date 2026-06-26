"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChat } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import GroupInfo from "./GroupInfo";
import ContextMenu from "./ContextMenu";
import ImageLightbox from "./ImageLightbox";
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

export default function ChatWindow() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const conversation = conversations.find((c) => c.id === activeConversation);
  const convMessages = conversation ? messages[conversation.id] || [] : [];

  const otherParticipant = conversation
    ? conversation.participants.find((p) => p.userId !== user!.id)
    : null;

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
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  // Auto scroll on new messages
  useEffect(() => {
    if (convMessages.length > 0) {
      const last = convMessages[convMessages.length - 1];
      if (last.senderId === user?.id) {
        scrollToBottom(true);
      }
    }
  }, [convMessages.length, user?.id, scrollToBottom]);

  // Notification sound
  const audioRef = useMemo(
    () =>
      typeof Audio !== "undefined" ? new Audio("/notification.mp3") : null,
    [],
  );

  useEffect(() => {
    const lastMessage = convMessages[convMessages.length - 1];
    if (lastMessage && lastMessage.senderId !== user?.id) {
      audioRef?.play().catch(() => {});
    }
  }, [convMessages, user?.id, audioRef]);

  // Typing users derived from context
  const typingList = activeConversation
    ? (contextTypingUsers[activeConversation] || []).map((u) => ({
        id: u.userId,
        name: u.name,
      }))
    : [];

  // Auto-mark messages as read
  useEffect(() => {
    if (!activeConversation || convMessages.length === 0) return;
    const hasUnread = convMessages.some(
      (m: any) =>
        m.senderId !== user?.id &&
        (!m.readBy || !m.readBy.some((r: any) => r.userId === user?.id)),
    );
    if (hasUnread) {
      markAsRead(activeConversation);
    }
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

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

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

  const contextMenuActions: ContextMenuAction[] = contextMenu
    ? [
        {
          id: "reply",
          label: "Reply",
          icon: "↩️",
          onClick: () => setReplyingTo(contextMenu.message),
        },
        {
          id: "copy",
          label: "Copy",
          icon: "📋",
          onClick: () => handleCopy(contextMenu.message.content),
        },
        ...(contextMenu.message.senderId === user?.id // Actions for the message owner
          ? [
              {
                id: "edit",
                label: "Edit",
                icon: "✏️",
                onClick: () => setEditingMessage(contextMenu.message),
              },
              {
                id: "delete",
                label: "Delete for everyone",
                icon: "🗑️",
                danger: true as const,
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
                icon: "🚫",
                danger: true as const,
                onClick: () =>
                  deleteMessage(
                    contextMenu.message.id,
                    activeConversation!,
                    false,
                  ),
              },
            ]
          : isManager // Actions for managers on other's messages
            ? [
                {
                  id: "delete",
                  label: "Delete for everyone",
                  icon: "🗑️",
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
      ]
    : [];

  // Empty state
  if (!activeConversation || !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center theme-dark:bg-[#0b141a] bg-[#efeae2]">
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-full theme-dark:bg-white/[0.06] bg-white/60 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="theme-dark:text-gray-400 text-gray-500"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold theme-dark:text-white text-gray-900 mb-2">
            Company Chat
          </h2>
          <p className="text-sm theme-dark:text-gray-400 text-gray-500 max-w-xs mx-auto leading-relaxed">
            {isManager
              ? "Select a conversation or create a new one to get started."
              : "Select a conversation from the sidebar to start messaging."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 theme-dark:bg-[#1f2c33] bg-[#f0f2f5] shrink-0 border-b theme-dark:border-white/[0.06] border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setActiveConversation(null)}
              className="md:hidden shrink-0 w-9 h-9 rounded-full theme-dark:hover:bg-white/[0.08] hover:bg-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 transition-all"
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
                className="ltr:scale-x-100 rtl:-scale-x-100"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="relative shrink-0">
              <div
                className="rounded-full flex items-center justify-center theme-dark:text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600"
                style={{ width: 40, height: 40, fontSize: "1rem" }}
              >
                {convName.charAt(0).toUpperCase()}
              </div>
              {otherParticipant && (
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 theme-dark:border-[#1f2c33] border-white rounded-full ${
                    isOnline
                      ? "bg-green-500"
                      : "theme-dark:bg-gray-600 bg-gray-400"
                  }`}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm sm:text-base theme-dark:text-white text-gray-900 truncate">
                {convName}
              </div>
              <div className="text-xs theme-dark:text-gray-400 text-gray-500">
                {otherParticipant ? (
                  isOnline ? (
                    <span className="text-green-500 font-medium">Online</span>
                  ) : (
                    <span>Offline</span>
                  )
                ) : (
                  <span>{conversation.participants.length} members</span>
                )}
              </div>
            </div>
          </div>
          <button
            className="shrink-0 w-9 h-9 rounded-full theme-dark:hover:bg-white/[0.08] hover:bg-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 transition-all"
            onClick={() => setShowInfo(true)}
            title="Conversation info"
            aria-label="Info"
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
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          dir="ltr"
          className="flex-1 overflow-y-auto px-4 py-3 theme-dark:bg-[#0b141a] bg-[#efeae2]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <div className="flex flex-col min-h-full">
            {convMessages.length === 0 && typingList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full theme-dark:bg-white/[0.06] bg-white/60 flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="theme-dark:text-gray-400 text-gray-500"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div className="text-sm theme-dark:text-gray-400 text-gray-500 mb-1">
                  No messages yet
                </div>
                <div className="text-xs theme-dark:text-gray-500 text-gray-400">
                  Send a message to start the conversation
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1" />
                <div className="py-4">
                  {(convMessages as any[]).map((msg: any, idx: number) => {
                    const isSent = msg.senderId === user!.id;
                    const prevMsg = convMessages[idx - 1];
                    const showSender =
                      !isSent && prevMsg?.senderId !== msg.senderId;
                    const sameAsPrevSender =
                      !!prevMsg && prevMsg.senderId === msg.senderId;
                    return (
                      <div
                        key={msg.id}
                        className={sameAsPrevSender ? "mt-0.5" : "mt-2.5"}
                      >
                        <MessageBubble
                          message={msg}
                          isSent={isSent}
                          showSender={showSender}
                          isGroup={isGroup}
                          onReply={(m) => setReplyingTo(m as any)}
                          onContextMenu={handleContextMenu}
                          onReact={handleReact}
                          onRemoveReaction={handleRemoveReaction}
                          currentUserId={user!.id}
                          highlight={highlightMessageId === msg.id}
                          onScrollToMessage={handleScrollToMessage}
                          onImageClick={setLightboxImage}
                        />
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typingList.length > 0 && (
                    <div className="flex justify-start animate-fade-in-up">
                      <div className="theme-dark:bg-white/10 bg-gray-100 backdrop-blur-md border theme-dark:border-white/10 border-gray-200 theme-dark:text-gray-300 text-gray-600 rounded-[1.25rem] rounded-bl-md px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex gap-1">
                            <span
                              className="w-1.5 h-1.5 theme-dark:bg-gray-400 bg-gray-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 theme-dark:bg-gray-400 bg-gray-500 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 theme-dark:bg-gray-400 bg-gray-500 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                          <span className="text-xs theme-dark:text-gray-400 text-gray-500">
                            {typingList.length === 1
                              ? `${typingList[0].name} is typing...`
                              : `${typingList.length} people are typing...`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0">
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
          />
        </div>
      </div>

      {showInfo && conversation && (
        <GroupInfo
          conversation={conversation}
          onClose={() => setShowInfo(false)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
      {/* Backdrop + Context Menu */}
      {contextMenu && (
        <div className="context-menu-backdrop" onClick={handleCloseContextMenu}>
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenuActions}
            onClose={handleCloseContextMenu}
            isOwn={contextMenu.message.senderId === user?.id}
          />
        </div>
      )}
    </>
  );
}
