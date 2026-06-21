"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import GroupInfo from "./GroupInfo";


interface UploadedFile {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
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

export default function ChatWindow() {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    sendMessage,
    sendFileMessage,
    onlineUsers,
    isManager,
    setActiveConversation,
    markAsRead,
  } = useChat();
  const [showInfo, setShowInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [recordingUsers, setRecordingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === activeConversation);
  const convMessages = conversation ? messages[conversation.id] || [] : [];

  const otherParticipant = conversation
    ? conversation.participants.find((p) => p.userId !== user!.id)
    : null;

  const convName = conversation
    ? getConversationName(conversation.participants, user!.id, conversation.title)
    : "";
  const isOnline = otherParticipant ? onlineUsers.has(otherParticipant.userId) : false;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [convMessages, scrollToBottom]);

  useEffect(() => {
    if (!conversation) return;
    const socket = (window as any).__socket;
    if (!socket) return;

    const handleTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId !== conversation.id) return;
      setTypingUsers((prev) => new Set(prev).add(data.userId));
    };

    const handleStopTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId !== conversation.id) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handleRecording = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId !== conversation.id) return;
      setRecordingUsers((prev) => new Set(prev).add(data.userId));
    };

    const handleStopRecording = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId !== conversation.id) return;
      setRecordingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on("user-typing", handleTyping);
    socket.on("user-stop-typing", handleStopTyping);
    socket.on("user-recording", handleRecording);
    socket.on("user-stop-recording", handleStopRecording);

    return () => {
      socket.off("user-typing", handleTyping);
      socket.off("user-stop-typing", handleStopTyping);
      socket.off("user-recording", handleRecording);
      socket.off("user-stop-recording", handleStopRecording);
    };
  }, [conversation]);

  const handleSend = useCallback(
    (content: string) => {
      if (activeConversation) sendMessage(activeConversation, content);
    },
    [activeConversation, sendMessage]
  );

  const handleSendFile = useCallback(
    (content: string, files: UploadedFile[]) => {
      if (activeConversation) sendFileMessage(activeConversation, content, files);
    },
    [activeConversation, sendFileMessage]
  );

  const handleTyping = useCallback(() => {
    const socket = (window as any).__socket;
    if (socket && activeConversation) {
      socket.emit("typing", { conversationId: activeConversation });
    }
  }, [activeConversation]);

  const handleStopTyping = useCallback(() => {
    const socket = (window as any).__socket;
    if (socket && activeConversation) {
      socket.emit("stop-typing", { conversationId: activeConversation });
    }
  }, [activeConversation]);

  const handleRecording = useCallback(() => {
    const socket = (window as any).__socket;
    if (socket && activeConversation) {
      socket.emit("recording", { conversationId: activeConversation });
    }
  }, [activeConversation]);

  const handleStopRecording = useCallback(() => {
    const socket = (window as any).__socket;
    if (socket && activeConversation) {
      socket.emit("stop-recording", { conversationId: activeConversation });
    }
  }, [activeConversation]);

  // Auto-mark messages as read
  useEffect(() => {
    if (!activeConversation || convMessages.length === 0) return;
    const hasUnread = convMessages.some(
      (m) => m.senderId !== user?.id && (!m.readBy || !m.readBy.some((r) => r.userId === user?.id))
    );
    if (hasUnread) {
      markAsRead(activeConversation);
    }
  }, [activeConversation, convMessages.length, markAsRead, user?.id]);

  if (!activeConversation || !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center theme-dark:bg-[#0b141a] bg-[#efeae2]">
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-full theme-dark:bg-white/[0.06] bg-white/60 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="theme-dark:text-gray-400 text-gray-500">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold theme-dark:text-white text-gray-900 mb-2">
            {!activeConversation ? "Company Chat" : "Loading..."}
          </h2>
          <p className="text-sm theme-dark:text-gray-400 text-gray-500 max-w-xs mx-auto leading-relaxed">
            {!activeConversation
              ? (isManager
                  ? "Select a conversation or create a new one to get started."
                  : "Select a conversation from the sidebar to start messaging.")
              : "Please wait..."}
          </p>
        </div>
      </div>
    );
  }

  const typingName =
    typingUsers.size > 0 && otherParticipant && typingUsers.has(otherParticipant.userId)
      ? otherParticipant.user.name
      : null;

  const recordingName =
    recordingUsers.size > 0 && otherParticipant && recordingUsers.has(otherParticipant.userId)
      ? otherParticipant.user.name
      : null;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 theme-dark:bg-[#1f2c33] bg-[#f0f2f5] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setActiveConversation(null)}
              className="md:hidden shrink-0 w-9 h-9 rounded-full theme-dark:hover:bg-white/[0.08] hover:bg-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="relative shrink-0">
              <div
                className="rounded-full flex items-center justify-center theme-dark:text-white font-bold theme-dark:bg-[#6a7175] bg-[#aeb9bf]"
                style={{ width: 40, height: 40, fontSize: "1rem" }}
              >
                {convName.charAt(0).toUpperCase()}
              </div>
              {otherParticipant && isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 theme-dark:border-[#1f2c33] border-white rounded-full" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-base theme-dark:text-white text-gray-900 truncate">{convName}</div>
              <div className="text-xs theme-dark:text-gray-400 text-gray-500">
                {otherParticipant ? (
                  isOnline ? "online" : "offline"
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {conversation!.participants.filter((p) => p.userId !== user!.id).map((p) => (
                      <span key={p.userId} className="inline-flex items-center gap-1">
                        <span className="text-[10px] font-medium px-1 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                          {p.user.role === "admin" ? "Admin" : p.user.role === "hr" ? "HR" : p.user.role === "employee" ? "Employee" : "عميل"}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            className="shrink-0 w-9 h-9 rounded-full theme-dark:hover:bg-white/[0.08] hover:bg-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 transition-all"
            onClick={() => setShowInfo(true)}
            title="Conversation info"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 theme-dark:bg-[#0b141a] bg-[#efeae2]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <div className="flex flex-col min-h-full">
            {convMessages.length === 0 && !typingName && !recordingName ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full theme-dark:bg-white/[0.06] bg-white/60 flex items-center justify-center mb-4 shadow-sm">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="theme-dark:text-gray-400 text-gray-500">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div className="text-sm theme-dark:text-gray-400 text-gray-500 mb-1">No messages yet</div>
                <div className="text-xs theme-dark:text-gray-500 text-gray-400">Send a message to start the conversation</div>
              </div>
            ) : (
              <>
                <div className="flex-1" />
                <div className="space-y-2.5 py-4">
                  {convMessages.map((msg) => {
                    const isSent = msg.senderId === user!.id;
                    const prevMsg = convMessages[convMessages.indexOf(msg) - 1];
                    const showSender = prevMsg?.senderId !== msg.senderId;
                    return (
                      <MessageBubble
                        key={msg.id}
                        id={msg.id}
                        content={msg.content}
                        sender={msg.sender}
                        isSent={isSent}
                        timestamp={msg.createdAt}
                        showSender={showSender}
                        attachments={msg.attachments}
                        reactions={msg.reactions}
                        readBy={msg.readBy}
                        conversationId={msg.conversationId}
                      />
                    );
                  })}

                  {typingName && (
                    <div className="flex justify-start animate-fade-in-up">
                      <div className="theme-dark:bg-white/10 bg-gray-100 backdrop-blur-md border theme-dark:border-white/10 border-gray-200 theme-dark:text-gray-300 text-gray-600 rounded-[1.25rem] rounded-bl-md px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 theme-dark:bg-gray-400 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 theme-dark:bg-gray-400 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 theme-dark:bg-gray-400 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-xs theme-dark:text-gray-400 text-gray-500">{typingName} typing...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {recordingName && (
                    <div className="flex justify-start animate-fade-in-up">
                      <div className="theme-dark:bg-white/10 bg-gray-100 backdrop-blur-md border theme-dark:border-white/10 border-gray-200 theme-dark:text-gray-300 text-gray-600 rounded-[1.25rem] rounded-bl-md px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs theme-dark:text-gray-400 text-gray-500">{recordingName} recording...</span>
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

        {/* Input — fixed bottom */}
        <div className="flex-shrink-0">
          <ChatInput
            conversationId={activeConversation}
            onSend={handleSend}
            onSendFile={handleSendFile}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            onRecording={handleRecording}
            onStopRecording={handleStopRecording}
          />
        </div>
      </div>

      {showInfo && conversation && (
        <GroupInfo conversation={conversation} onClose={() => setShowInfo(false)} />
      )}
    </>
  );
}
