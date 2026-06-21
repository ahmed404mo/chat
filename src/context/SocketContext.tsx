"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { getSocket } from "@/lib/socket";
import { useAuth } from "./AuthContext";

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  publicId: string | null;
  createdAt: string;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string; role: string };
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; name: string; role: string };
  conversationId: string;
  attachments: Attachment[];
  reactions: Reaction[];
  readBy: { userId: string; user: { id: string; name: string; role: string }; readAt: string }[];
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  id: string;
  userId: string;
  user: { id: string; name: string; role: string };
}

interface Conversation {
  id: string;
  title: string | null;
  isGroup: boolean;
  createdById: string | null;
  participants: Participant[];
  messages: Message[];
  inviteCodes?: {
    id: string;
    code: string;
    expiresAt: string | null;
    maxUses: number;
    usedCount: number;
    isActive: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface InviteInfo {
  id: string;
  code: string;
  conversationId: string;
  inviteLink: string;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

interface SocketContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  onlineUsers: Set<string>;
  typingUsers: Record<string, { userId: string; name: string }[]>;
  activeConversation: string | null;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string) => void;
  emitTyping: (conversationId: string) => void;
  emitStopTyping: (conversationId: string) => void;
  loadMoreMessages: (conversationId: string) => void;
  hasMoreMessages: Record<string, boolean>;
  unreadCounts: Record<string, number>;
  joinViaInvite: (code: string) => Promise<string>;
  generateInvite: (conversationId: string, expiresInHours?: number, maxUses?: number) => Promise<InviteInfo>;
  createConversation: (participantIds: string[], title?: string) => Promise<Conversation>;
  isManager: boolean;
  users: { id: string; name: string; email: string; role: string }[];
  fetchUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  addMembers: (conversationId: string, userIds: string[]) => Promise<void>;
  sendFileMessage: (conversationId: string, content: string, attachments: Omit<Attachment, "id" | "createdAt">[]) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string, conversationId: string) => void;
  removeReaction: (messageId: string, conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; name: string }[]>>({});
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const cursors = useRef<Record<string, string | null>>({});
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const userRef = useRef(user);
  userRef.current = user;
  const pendingTemps = useRef<Set<string>>(new Set());
  const isManager = user?.role === "admin" || user?.role === "hr";

  // Pre-initialise notification audio once
  useEffect(() => {
    if (!notificationAudio.current) {
      notificationAudio.current = new Audio("/notification.mp3");
      notificationAudio.current.volume = 0.4;
    }
    // Request notification permission on mount (after user gesture has happened)
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = useCallback(
    (senderName: string, messageContent: string, conversationId: string) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      try {
        const n = new Notification("New message from " + senderName, {
          body: messageContent,
          icon: "/favicon.ico",
          tag: conversationId,
          requireInteraction: false,
        });
        n.onclick = () => {
          window.focus();
          if (n.tag) setActiveConversation(n.tag);
          n.close();
        };
      } catch {
        // silently fail
      }
    },
    [setActiveConversation]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/chat/conversations", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [token]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      try {
        const cursor = cursors.current[conversationId] || "";
        const url = `/api/chat/messages?conversationId=${conversationId}${cursor ? `&cursor=${cursor}` : ""}`;
        const res = await fetch(url, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setMessages((prev) => {
          const existing = prev[conversationId] || [];
          const incoming = data.messages ?? [];
          const combined = [...incoming, ...existing];
          const seen = new Set<string>();
          const deduped = combined.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
          return { ...prev, [conversationId]: deduped };
        });
        cursors.current[conversationId] = data.nextCursor ?? null;
        setHasMoreMessages((prev) => ({ ...prev, [conversationId]: data.hasMore ?? false }));
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!user || !token) {
      setConversations([]);
      setMessages({});
      setUnreadCounts({});
      return;
    }
    fetchConversations();
    if (isManager) fetchUsers();
  }, [user, token, fetchConversations, fetchUsers, isManager]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      fetchConversations();
      if (activeConversationRef.current) {
        fetchMessages(activeConversationRef.current);
      }
    };
    socket.on("connect", handleConnect);

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => {
        const convMessages = prev[message.conversationId] || [];
        const hasTemp = convMessages.some((m) => m.id.startsWith("temp-"));
        if (hasTemp) {
          const real = convMessages.filter((m) => !m.id.startsWith("temp-"));
          if (real.some((m) => m.id === message.id)) return prev;
          return { ...prev, [message.conversationId]: [...real, message] };
        }
        if (convMessages.some((m) => m.id === message.id)) return prev;
        return { ...prev, [message.conversationId]: [...convMessages, message] };
      });
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === message.conversationId
            ? { ...c, messages: [message], updatedAt: message.createdAt }
            : c
        );
        if (!updated.find((c) => c.id === message.conversationId)) {
          fetchConversations();
          return prev;
        }
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      const currentUser = userRef.current;
      const currentActive = activeConversationRef.current;
      if (currentUser && message.senderId !== currentUser.id) {
        if (currentActive !== message.conversationId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.conversationId]: (prev[message.conversationId] || 0) + 1,
          }));
        }
        // Notify for messages from others
        if (document.hidden) {
          showBrowserNotification(
            message.sender?.name || "Someone",
            message.content || "Sent a file",
            message.conversationId
          );
        } else {
          if (notificationAudio.current) {
            const audio = notificationAudio.current;
            audio.currentTime = 0;
            audio.play().catch(() => {
              const fallback = new Audio("/notification.mp3");
              fallback.volume = 0.4;
              fallback.play().catch(() => {});
            });
          }
        }
      }
    };

    const handleUserTyping = ({ userId, name, conversationId }: { userId: string; name: string; conversationId: string }) => {
      setTypingUsers((prev) => {
        const existing = prev[conversationId] || [];
        if (existing.find((u) => u.userId === userId)) return prev;
        return { ...prev, [conversationId]: [...existing, { userId, name }] };
      });
      setTimeout(() => {
        setTypingUsers((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).filter((u) => u.userId !== userId),
        }));
      }, 3000);
    };

    const handleUserStopTyping = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter((u) => u.userId !== userId),
      }));
    };

    const handleUserOnline = (userId: string) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    const handleUserOffline = (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const handleMemberAdded = ({
      conversationId,
    }: {
      conversationId: string;
    }) => {
      if (conversationId === activeConversation) {
        fetchConversations();
      }
    };

    const handleConversationUpdated = ({
      conversationId,
      title,
    }: {
      conversationId: string;
      title: string;
    }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, title } : c
        )
      );
    };

    const handleReactionAdded = ({
      messageId, conversationId, reaction,
    }: {
      messageId: string; conversationId: string; reaction: Reaction;
    }) => {
      setMessages((prev) => {
        const msgs = prev[conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [conversationId]: msgs.map((m) => {
            if (m.id !== messageId) return m;
            // Remove any existing reaction by this user (both temp and previous emoji), then add the real one
            const filtered = (m.reactions || []).filter((r) => r.userId !== reaction.userId);
            return { ...m, reactions: [...filtered, reaction] };
          }),
        };
      });
    };

    const handleReactionRemoved = ({
      messageId, conversationId, userId,
    }: {
      messageId: string; conversationId: string; userId: string; emoji: string;
    }) => {
      setMessages((prev) => {
        const msgs = prev[conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [conversationId]: msgs.map((m) =>
            m.id === messageId
              ? { ...m, reactions: (m.reactions || []).filter((r) => r.userId !== userId) }
              : m
          ),
        };
      });
    };

    const handleMessagesRead = ({
      conversationId, userId: readUserId, userName, userRole, readAt, messageIds,
    }: {
      conversationId: string; userId: string; userName: string; userRole: string; readAt: string; messageIds: string[];
    }) => {
      setMessages((prev) => {
        const msgs = prev[conversationId];
        if (!msgs) return prev;
        const readSet = new Set(messageIds);
        return {
          ...prev,
          [conversationId]: msgs.map((m) =>
            readSet.has(m.id)
              ? { ...m, readBy: [...(m.readBy || []), { userId: readUserId, user: { id: readUserId, name: userName, role: userRole }, readAt }] }
              : m
          ),
        };
      });
    };

    socket.on("new-message", handleNewMessage);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("member-added", handleMemberAdded);
    socket.on("conversation-updated", handleConversationUpdated);
    socket.on("message-reaction-added", handleReactionAdded);
    socket.on("message-reaction-removed", handleReactionRemoved);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("connect", handleConnect);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("member-added", handleMemberAdded);
      socket.off("conversation-updated", handleConversationUpdated);
      socket.off("message-reaction-added", handleReactionAdded);
      socket.off("message-reaction-removed", handleReactionRemoved);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [fetchConversations, fetchMessages]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const socket = getSocket();
    if (!socket) return;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const role = userRef.current?.role || "user";
    const optimistic: Message = {
      id: tempId,
      content,
      senderId: userRef.current?.id || "",
      sender: { id: userRef.current?.id || "", name: userRef.current?.name || "", role },
      conversationId,
      attachments: [],
      reactions: [],
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimistic],
    }));
    socket.emit("send-message", { conversationId, content });
    setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
  }, []);

  const sendFileMessage = useCallback(
    (conversationId: string, content: string, attachments: Omit<Attachment, "id" | "createdAt">[]) => {
      const socket = getSocket();
      if (!socket) return;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const role = userRef.current?.role || "user";
      const optimistic: Message = {
        id: tempId,
        content,
        senderId: userRef.current?.id || "",
        sender: { id: userRef.current?.id || "", name: userRef.current?.name || "", role },
        conversationId,
        attachments: attachments.map((a) => ({ ...a, id: "", createdAt: new Date().toISOString() })),
        reactions: [],
        readBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), optimistic],
      }));
      socket.emit("send-message", { conversationId, content, attachments });
      setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
    },
    []
  );

  const emitTyping = useCallback((conversationId: string) => {
    getSocket()?.emit("typing", { conversationId });
  }, []);

  const emitStopTyping = useCallback((conversationId: string) => {
    getSocket()?.emit("stop-typing", { conversationId });
  }, []);

  const loadMoreMessages = useCallback(
    (conversationId: string) => {
      if (!hasMoreMessages[conversationId]) return;
      fetchMessages(conversationId);
    },
    [hasMoreMessages, fetchMessages]
  );

  const joinViaInvite = useCallback(async (code: string): Promise<string> => {
    const res = await fetch("/api/chat/invite/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to join");
    await fetchConversations();
    return data.conversationId;
  }, [token, fetchConversations]);

  const generateInvite = useCallback(
    async (conversationId: string, expiresInHours?: number, maxUses?: number): Promise<InviteInfo> => {
      const res = await fetch("/api/chat/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, expiresInHours, maxUses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate invite");
      return data.invite;
    },
    [token]
  );

  const createConversation = useCallback(
    async (participantIds: string[], title?: string): Promise<Conversation> => {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantIds, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create conversation");
      await fetchConversations();
      return data.conversation;
    },
    [token, fetchConversations]
  );

  const addMembers = useCallback(
    async (conversationId: string, userIds: string[]) => {
      const res = await fetch(`/api/chat/conversations/${conversationId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add members");
      await fetchConversations();
      const socket = getSocket();
      if (socket) {
        socket.emit("member-added", { conversationId, userIds: data.added?.map((u: { id: string }) => u.id) || userIds });
      }
      return data;
    },
    [token, fetchConversations]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const res = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete group");
      if (activeConversation === conversationId) {
        setActiveConversation(null);
      }
      await fetchConversations();
    },
    [token, fetchConversations, activeConversation]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      const res = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename group");
      const socket = getSocket();
      if (socket) {
        socket.emit("conversation-updated", { conversationId, title: title.trim() });
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, title: title.trim() } : c
        )
      );
    },
    [token]
  );

  const addReaction = useCallback((messageId: string, emoji: string, conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    const tempUser = userRef.current;
    // Optimistic update
    setMessages((prev) => {
      const msgs = prev[conversationId];
      if (!msgs) return prev;
      return {
        ...prev,
        [conversationId]: msgs.map((m) => {
          if (m.id !== messageId) return m;
          const filtered = (m.reactions || []).filter((r) => r.userId !== tempUser?.id);
          return {
            ...m,
            reactions: [...filtered, { id: `temp-${Date.now()}`, emoji, userId: tempUser?.id || "", user: { id: tempUser?.id || "", name: tempUser?.name || "", role: tempUser?.role || "user" } }],
          };
        }),
      };
    });
    socket.emit("add-reaction", { messageId, emoji, conversationId });
  }, []);

  const removeReaction = useCallback((messageId: string, conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    const tempUser = userRef.current;
    // Optimistic update
    setMessages((prev) => {
      const msgs = prev[conversationId];
      if (!msgs) return prev;
      return {
        ...prev,
        [conversationId]: msgs.map((m) => {
          if (m.id !== messageId) return m;
          return { ...m, reactions: (m.reactions || []).filter((r) => r.userId !== tempUser?.id) };
        }),
      };
    });
    socket.emit("remove-reaction", { messageId, conversationId });
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("mark-read", { conversationId });
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      setUnreadCounts((prev) => ({ ...prev, [activeConversation]: 0 }));
      const socket = getSocket();
      if (socket) {
        socket.emit("join-conversation", activeConversation, (res: { success?: boolean; error?: string }) => {
          if (!res?.success) {
            setActiveConversation(null);
          }
        });
      }
    }
  }, [activeConversation, fetchMessages]);

  return (
    <SocketContext.Provider
      value={{
        conversations,
        messages,
        onlineUsers,
        typingUsers,
        activeConversation,
        setActiveConversation,
        sendMessage,
        sendFileMessage,
        emitTyping,
        emitStopTyping,
        loadMoreMessages,
        hasMoreMessages,
        unreadCounts,
        joinViaInvite,
        generateInvite,
        createConversation,
        isManager,
        users,
        fetchUsers,
        fetchConversations,
        addMembers,
        deleteConversation,
        renameConversation,
        addReaction,
        removeReaction,
        markAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useChat must be used within SocketProvider");
  return ctx;
}
