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
import { getPusherClient, subscribeToChannel, unsubscribeFromChannel } from "@/lib/socket";
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

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string; role: string };
}

export interface Message {
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
  status?: string;
  isEdited?: boolean;
  pinned?: boolean;
  mentionedUserIds?: string[];
  repliedTo?: (Message & { sender: { id: string; name: string; role: string } }) | null;
}

interface Participant {
  id: string;
  userId: string;
  user: { id: string; name: string; role: string; avatarUrl?: string | null };
}

interface Conversation {
  id: string;
  title: string | null;
  imageUrl: string | null;
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
  sendMessage: (conversationId: string, content: string, repliedToId?: string, files?: any[], repliedToMessage?: Message | null) => void;
  emitTyping: (conversationId: string) => void;
  emitStopTyping: (conversationId: string) => void;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  loadingMoreMessages: Record<string, boolean>;
  hasMoreMessages: Record<string, boolean>;
  unreadCounts: Record<string, number>;
  joinViaInvite: (code: string) => Promise<string>;
  generateInvite: (conversationId: string, expiresInHours?: number, maxUses?: number) => Promise<InviteInfo>;
  createConversation: (participantIds: string[], title?: string) => Promise<Conversation>;
  isManager: boolean;
  users: { id: string; name: string; email: string; role: string; avatarUrl?: string | null }[];
  fetchUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  addMembers: (conversationId: string, userIds: string[]) => Promise<void>;
  sendFileMessage: (conversationId: string, content: string, attachments: Omit<Attachment, "id" | "createdAt">[]) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  uploadConversationImage: (conversationId: string, file: File) => Promise<string>;
  addReaction: (messageId: string, emoji: string, conversationId: string) => void;
  removeReaction: (messageId: string, conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
  editMessage: (messageId: string, content: string, conversationId: string) => void;
  deleteMessage: (messageId: string, conversationId: string, forEveryone: boolean) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

function authHeaders(token: string | null): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

function authJson(token: string | null): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders(token) };
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; name: string }[]>>({});
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string; avatarUrl?: string | null }[]>([]);
  const cursors = useRef<Record<string, string | null>>({});
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const userRef = useRef(user);
  userRef.current = user;
  const subscribedConversations = useRef<Set<string>>(new Set());
  const isManager = user?.role === "admin" || user?.role === "hr";

  useEffect(() => {
    if (!notificationAudio.current) {
      notificationAudio.current = new Audio("/notification.mp3");
      notificationAudio.current.volume = 0.4;
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = useCallback(
    (senderName: string, messageContent: string, conversationId: string, isMention?: boolean) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      try {
        const title = isMention
          ? `${senderName} mentioned you`
          : "New message from " + senderName;
        const n = new Notification(title, {
          body: messageContent,
          icon: "/favicon.ico",
          tag: conversationId,
          requireInteraction: isMention ?? false,
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
        headers: authHeaders(token),
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
        headers: authHeaders(token),
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
          headers: authHeaders(token),
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

  // Subscribe to Pusher channels for each conversation
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || conversations.length === 0) return;

    const currentSubscribed = new Set(subscribedConversations.current);
    const conversationIds = new Set(conversations.map((c) => c.id));

    // Unsubscribe from conversations no longer in list
    currentSubscribed.forEach((convId) => {
      if (!conversationIds.has(convId)) {
        unsubscribeFromChannel(`private-conversation-${convId}`);
        subscribedConversations.current.delete(convId);
      }
    });

    // Subscribe to new conversations
    conversations.forEach((conv) => {
      const channelName = `private-conversation-${conv.id}`;
      if (subscribedConversations.current.has(conv.id)) return;

      const channel = subscribeToChannel(channelName);
      if (!channel) return;
      subscribedConversations.current.add(conv.id);

      channel.bind("new-message", (message: Message) => {
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
          const isMention = message.mentionedUserIds?.includes(currentUser.id);
          if (currentActive !== message.conversationId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [message.conversationId]: (prev[message.conversationId] || 0) + (isMention ? 2 : 1),
            }));
          }
          if (document.hidden || isMention) {
            showBrowserNotification(
              message.sender?.name || "Someone",
              message.content || "Sent a file",
              message.conversationId,
              isMention
            );
          }
          if (!document.hidden && !isMention) {
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
      });

      channel.bind("user-typing", ({ userId, name, conversationId }: { userId: string; name: string; conversationId: string }) => {
        if (userId === userRef.current?.id) return;
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
      });

      channel.bind("user-stop-typing", ({ userId, conversationId }: { userId: string; conversationId: string }) => {
        if (userId === userRef.current?.id) return;
        setTypingUsers((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).filter((u) => u.userId !== userId),
        }));
      });

      channel.bind("member-added", ({ conversationId: cId }: { conversationId: string }) => {
        if (cId === activeConversationRef.current) {
          fetchConversations();
        }
      });

      channel.bind("conversation-updated", ({ conversationId, title, imageUrl }: { conversationId: string; title?: string; imageUrl?: string }) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, ...(title !== undefined && { title }), ...(imageUrl !== undefined && { imageUrl }) }
              : c
          )
        );
      });

      channel.bind("message-reaction-added", ({ messageId, conversationId, reaction }: { messageId: string; conversationId: string; reaction: Reaction }) => {
        setMessages((prev) => {
          const msgs = prev[conversationId];
          if (!msgs) return prev;
          return {
            ...prev,
            [conversationId]: msgs.map((m) => {
              if (m.id !== messageId) return m;
              const filtered = (m.reactions || []).filter((r) => r.userId !== reaction.userId);
              return { ...m, reactions: [...filtered, reaction] };
            }),
          };
        });
      });

      channel.bind("message-reaction-removed", ({ messageId, conversationId, userId }: { messageId: string; conversationId: string; userId: string }) => {
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
      });

      channel.bind("messages-read", ({ conversationId, userId: readUserId, userName, userRole, readAt, messageIds }: {
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
      });

      channel.bind("message-edited", (message: Message) => {
        setMessages((prev) => {
          const msgs = prev[message.conversationId];
          if (!msgs) return prev;
          return {
            ...prev,
            [message.conversationId]: msgs.map((m) =>
              m.id === message.id ? { ...m, ...message } : m
            ),
          };
        });
      });

      channel.bind("message-deleted", ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
        setMessages((prev) => {
          const msgs = prev[conversationId];
          if (!msgs) return prev;
          return {
            ...prev,
            [conversationId]: msgs.filter((m) => m.id !== messageId),
          };
        });
      });
    });
  }, [conversations, fetchConversations, fetchMessages, showBrowserNotification]);

  // Subscribe to presence channel for online users
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !token) return;

    const presenceChannel = subscribeToChannel("presence-global");
    if (!presenceChannel) return;

    const handleMemberAdded = (member: any) => {
      if (member.id !== userRef.current?.id) {
        setOnlineUsers((prev) => new Set(prev).add(member.id));
      }
    };

    const handleMemberRemoved = (member: any) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    };

    // Initial members
    presenceChannel.bind("pusher:subscription_succeeded", (members: any) => {
      const ids: string[] = [];
      members.each((member: any) => ids.push(member.id));
      setOnlineUsers(new Set(ids));
    });

    presenceChannel.bind("pusher:member_added", handleMemberAdded);
    presenceChannel.bind("pusher:member_removed", handleMemberRemoved);

    return () => {
      presenceChannel.unbind("pusher:subscription_succeeded");
      presenceChannel.unbind("pusher:member_added", handleMemberAdded);
      presenceChannel.unbind("pusher:member_removed", handleMemberRemoved);
    };
  }, [token]);

  const sendMessage = useCallback((conversationId: string, content: string, repliedToId?: string, files?: any[], repliedToMessage?: Message | null) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const role = userRef.current?.role || "user";
    const optimistic: Message = {
      id: tempId,
      content,
      senderId: userRef.current?.id || "",
      sender: { id: userRef.current?.id || "", name: userRef.current?.name || "", role },
      conversationId,
      attachments: files ? files.map((a: any) => ({ ...a, id: "", createdAt: new Date().toISOString() })) : [],
      reactions: [],
      readBy: [],
      repliedTo: repliedToMessage || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimistic],
    }));
    fetch(`/api/chat/messages`, {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify({ conversationId, content, repliedToId, attachments: files }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown" }));
          console.error("send-message API error:", res.status, err);
        }
      })
      .catch((err) => console.error("send-message fetch error:", err));
    setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
  }, [token]);

  const sendFileMessage = useCallback(
    (conversationId: string, content: string, attachments: Omit<Attachment, "id" | "createdAt">[]) => {
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
      fetch(`/api/chat/messages`, {
        method: "POST",
        headers: authJson(token),
        body: JSON.stringify({ conversationId, content, attachments }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Unknown" }));
            console.error("send-file-message API error:", res.status, err);
          }
        })
        .catch((err) => console.error("send-file-message fetch error:", err));
      setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
    },
    [token]
  );

  const emitTyping = useCallback((conversationId: string) => {
    fetch("/api/chat/typing", {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify({ conversationId, action: "typing" }),
    }).catch(() => {});
  }, [token]);

  const emitStopTyping = useCallback((conversationId: string) => {
    fetch("/api/chat/typing", {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify({ conversationId, action: "stop-typing" }),
    }).catch(() => {});
  }, [token]);

  const [loadingMoreMessages, setLoadingMoreMessages] = useState<Record<string, boolean>>({});

  const loadMoreMessages = useCallback(
    async (conversationId: string) => {
      if (hasMoreMessages[conversationId] === false) return;
      if (loadingMoreMessages[conversationId]) return;
      setLoadingMoreMessages((prev) => ({ ...prev, [conversationId]: true }));
      await fetchMessages(conversationId);
      setLoadingMoreMessages((prev) => ({ ...prev, [conversationId]: false }));
    },
    [hasMoreMessages, loadingMoreMessages, fetchMessages]
  );

  const joinViaInvite = useCallback(async (code: string): Promise<string> => {
    const res = await fetch("/api/chat/invite/join", {
      method: "POST",
      headers: authJson(token),
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
        headers: authJson(token),
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
        headers: authJson(token),
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
        headers: authJson(token),
        body: JSON.stringify({ userIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add members");
      await fetchConversations();
      return data;
    },
    [token, fetchConversations]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const res = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
        headers: authHeaders(token),
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
        headers: authJson(token),
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename group");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, title: title.trim() } : c
        )
      );
    },
    [token]
  );

  const uploadConversationImage = useCallback(
    async (conversationId: string, file: File): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/chat/conversations/${conversationId}/image`, {
        method: "POST",
        headers: authHeaders(token),
        body: formData,
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Upload: non-JSON response", text);
        throw new Error(`Server error: ${res.status}`);
      }
      if (!res.ok) throw new Error(data.error || `Failed to upload image (${res.status})`);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, imageUrl: data.url } : c
        )
      );
      return data.url;
    },
    [token]
  );

  const addReaction = useCallback((messageId: string, emoji: string, conversationId: string) => {
    const tempUser = userRef.current;
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
    fetch("/api/chat/messages/reaction", {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify({ messageId, emoji, conversationId }),
    }).catch((err) => console.error("add-reaction error:", err));
  }, [token]);

  const removeReaction = useCallback((messageId: string, conversationId: string) => {
    const tempUser = userRef.current;
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
    fetch("/api/chat/messages/reaction", {
      method: "DELETE",
      headers: authJson(token),
      body: JSON.stringify({ messageId, conversationId }),
    }).catch((err) => console.error("remove-reaction error:", err));
  }, [token]);

  const editMessage = useCallback((messageId: string, content: string, conversationId: string) => {
    setMessages((prev) => {
      const msgs = prev[conversationId];
      if (!msgs) return prev;
      return {
        ...prev,
        [conversationId]: msgs.map((m) =>
          m.id === messageId ? { ...m, content, isEdited: true } : m
        ),
      };
    });
    fetch("/api/chat/messages/edit", {
      method: "PATCH",
      headers: authJson(token),
      body: JSON.stringify({ messageId, content, conversationId }),
    }).catch((err) => console.error("edit-message error:", err));
  }, [token]);

  const deleteMessage = useCallback((messageId: string, conversationId: string, forEveryone: boolean) => {
    if (!forEveryone) {
      setMessages((prev) => {
        const msgs = prev[conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, content: "🗑️ This message was deleted", attachments: [] } : m
          ),
        };
      });
    } else {
      setMessages((prev) => {
        const msgs = prev[conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [conversationId]: msgs.filter((m) => m.id !== messageId),
        };
      });
    }
    fetch("/api/chat/messages/delete", {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify({ messageId, conversationId, forEveryone }),
    }).catch((err) => console.error("delete-message error:", err));
  }, [token]);

  const markAsRead = useCallback((conversationId: string) => {
    fetch("/api/chat/messages/read", {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify({ conversationId }),
    }).catch(() => {});
  }, [token]);

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
        loadingMoreMessages,
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
        uploadConversationImage,
        addReaction,
        removeReaction,
        editMessage,
        deleteMessage,
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
