require("dotenv").config({ path: ".env" });
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const MANAGER_ROLES = ["admin", "hr"];

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.prepare().then(() => {
  const server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGINS?.split(",") || "http://localhost:3000",
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.USER_TOKEN_SECRET_KEY);
      socket.userId = decoded.id;
      socket.userName = decoded.name;
      socket.userRole = decoded.role;
      socket.isManager = MANAGER_ROLES.includes(decoded.role);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  const onlineUsers = new Map();

  io.on("connection", async (socket) => {
    onlineUsers.set(socket.userId, socket.id);
    io.emit("user-online", socket.userId);
    socket.join(`user:${socket.userId}`);

    // Auto-join all conversation rooms for real-time notifications
    try {
      const participations = await prisma.conversationParticipant.findMany({
        where: { userId: socket.userId },
        select: { conversationId: true },
      });
      participations.forEach(p => socket.join(p.conversationId));
    } catch (err) {
      console.error("Failed to auto-join conversations:", err);
    }

    // Safety net: ensure user is in the default group
    try {
      const DEFAULT_GROUP_TITLE = "عام";
      let defaultGroup = await prisma.conversation.findFirst({
        where: { title: DEFAULT_GROUP_TITLE, isGroup: true },
      });
      if (!defaultGroup) {
        defaultGroup = await prisma.conversation.create({
          data: { title: DEFAULT_GROUP_TITLE, isGroup: true },
        });
      }
      const inGroup = await prisma.conversationParticipant.findFirst({
        where: { conversationId: defaultGroup.id, userId: socket.userId },
      });
      if (!inGroup) {
        await prisma.conversationParticipant.create({
          data: { conversationId: defaultGroup.id, userId: socket.userId },
        });
        socket.join(defaultGroup.id);
      }
    } catch (err) {
      console.error("Failed to ensure default group:", err);
    }

    socket.on("join-conversation", async (conversationId, ack) => {
      try {
        const participation = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: socket.userId },
        });
        if (!participation) {
          return ack?.({ error: "Not a participant" });
        }
        socket.join(conversationId);
        ack?.({ success: true });
      } catch (err) {
        ack?.({ error: "Failed to join conversation" });
      }
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(conversationId);
    });

    socket.on("join-via-invite", async ({ code: rawCode }, ack) => {
      try {
        const code = rawCode?.trim().toUpperCase();
        if (!code) return ack?.({ error: "Invalid code" });
        const invite = await prisma.inviteCode.findUnique({ where: { code } });
        if (!invite) return ack?.({ error: "Invalid code" });
        if (!invite.isActive) return ack?.({ error: "Code deactivated" });
        if (invite.expiresAt && new Date() > invite.expiresAt) {
          return ack?.({ error: "Code expired" });
        }
        if (invite.usedCount >= invite.maxUses) {
          return ack?.({ error: "Code max uses reached" });
        }

        const existing = await prisma.conversationParticipant.findFirst({
          where: { conversationId: invite.conversationId, userId: socket.userId },
        });
        if (existing) {
          socket.join(invite.conversationId);
          return ack?.({ conversationId: invite.conversationId });
        }

        await prisma.$transaction([
          prisma.conversationParticipant.create({
            data: { conversationId: invite.conversationId, userId: socket.userId },
          }),
          prisma.inviteCode.update({
            where: { id: invite.id },
            data: { usedCount: { increment: 1 } },
          }),
        ]);

        socket.join(invite.conversationId);
        ack?.({ conversationId: invite.conversationId });
      } catch (err) {
        console.error("join-via-invite error:", err);
        ack?.({ error: "Failed to join" });
      }
    });

    socket.on("send-message", async (data, ack) => {
      try {
        const { conversationId, content, attachments } = data;
        if (!conversationId || (!content?.trim() && (!attachments || attachments.length === 0))) {
          return ack?.({ error: "Invalid message data" });
        }

        const participation = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: socket.userId },
        });
        if (!participation) {
          return ack?.({ error: "Not a participant" });
        }

        const repliedToId = data.repliedToId || null;
        const message = await prisma.message.create({
          data: {
            content: content?.trim() || "",
            senderId: socket.userId,
            conversationId,
            repliedToId,
            status: "DELIVERED",
            attachments: attachments?.length
              ? {
                  create: attachments.map((att) => ({
                    fileName: att.fileName,
                    fileSize: att.fileSize,
                    mimeType: att.mimeType,
                    url: att.url,
                    publicId: att.publicId || null,
                  })),
                }
              : undefined,
          },
          include: {
            sender: { select: { id: true, name: true, role: true } },
            repliedTo: {
              include: { sender: { select: { id: true, name: true, role: true } } },
            },
            attachments: true,
            reactions: { include: { user: { select: { id: true, name: true, role: true } } } },
            readBy: { include: { user: { select: { id: true, name: true, role: true } } } },
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        io.to(conversationId).emit("new-message", message);
        ack?.({ success: true, message });
      } catch (err) {
        console.error("send-message error:", err);
        ack?.({ error: "Failed to send message" });
      }
    });

    socket.on("typing", ({ conversationId, name }) => {
      socket.to(conversationId).emit("user-typing", {
        userId: socket.userId,
        name: name || socket.userName,
        conversationId,
      });
    });

    socket.on("stop-typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user-stop-typing", {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on("recording", ({ conversationId }) => {
      socket.to(conversationId).emit("user-recording", {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on("stop-recording", ({ conversationId }) => {
      socket.to(conversationId).emit("user-stop-recording", {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on("member-added", ({ conversationId, userIds }) => {
      if (userIds?.length) {
        userIds.forEach((uid) => {
          const targetSocketId = onlineUsers.get(uid);
          if (targetSocketId) {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.join(conversationId);
            }
          }
        });
      }
      socket.to(conversationId).emit("member-added", { conversationId });
    });

    socket.on("conversation-updated", ({ conversationId, title }) => {
      io.to(conversationId).emit("conversation-updated", { conversationId, title });
    });

    socket.on("mark-read", async ({ conversationId }) => {
      try {
        const unreadMessages = await prisma.message.findMany({
          where: {
            conversationId,
            senderId: { not: socket.userId },
            readBy: { none: { userId: socket.userId } },
          },
          select: { id: true },
        });
        if (unreadMessages.length === 0) return;
        const now = new Date();
        await prisma.messageRead.createMany({
          data: unreadMessages.map((m) => ({
            messageId: m.id,
            userId: socket.userId,
            readAt: now,
          })),
          skipDuplicates: true,
        });
        io.to(conversationId).emit("messages-read", {
          conversationId,
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
          readAt: now.toISOString(),
          messageIds: unreadMessages.map((m) => m.id),
        });
      } catch (err) {
        console.error("mark-read error:", err);
      }
    });

    socket.on("edit-message", async ({ messageId, content, conversationId }, ack) => {
      try {
        if (!messageId || !content?.trim()) return ack?.({ error: "Invalid data" });
        const message = await prisma.message.findFirst({
          where: { id: messageId, senderId: socket.userId },
        });
        if (!message) return ack?.({ error: "Not found or not yours" });
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content: content.trim(), isEdited: true },
          include: {
            sender: { select: { id: true, name: true, role: true } },
            attachments: true,
            reactions: { include: { user: { select: { id: true, name: true, role: true } } } },
            readBy: { include: { user: { select: { id: true, name: true, role: true } } } },
          },
        });
        io.to(conversationId).emit("message-edited", updated);
        ack?.({ success: true });
      } catch (err) {
        console.error("edit-message error:", err);
        ack?.({ error: "Failed to edit message" });
      }
    });

    socket.on("delete-message", async ({ messageId, conversationId, forEveryone }, ack) => {
      try {
        const message = await prisma.message.findFirst({
          where: { id: messageId },
        });
        if (!message) return ack?.({ error: "Not found" });
        if (message.senderId !== socket.userId) return ack?.({ error: "Not your message" });
        if (forEveryone) {
          await prisma.message.delete({ where: { id: messageId } });
          io.to(conversationId).emit("message-deleted", { messageId, conversationId });
        } else {
          const placeholder = await prisma.message.update({
            where: { id: messageId },
            data: { content: "🗑️ This message was deleted", attachments: { set: [] } },
          });
          io.to(conversationId).emit("message-edited", placeholder);
        }
        ack?.({ success: true });
      } catch (err) {
        console.error("delete-message error:", err);
        ack?.({ error: "Failed to delete message" });
      }
    });

    socket.on("pin-message", async ({ messageId, conversationId }, ack) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return ack?.({ error: "Not found" });
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { pinned: !message.pinned },
        });
        io.to(conversationId).emit("message-pinned", { messageId, conversationId, pinned: updated.pinned });
        ack?.({ success: true, pinned: updated.pinned });
      } catch (err) {
        console.error("pin-message error:", err);
        ack?.({ error: "Failed to pin message" });
      }
    });

    socket.on("add-reaction", async ({ messageId, emoji, conversationId }) => {
      try {
        // Upsert — one reaction per user per message (atomic, no race condition)
        const reaction = await prisma.messageReaction.upsert({
          where: { messageId_userId: { messageId, userId: socket.userId } },
          update: { emoji },
          create: { messageId, userId: socket.userId, emoji },
          include: { user: { select: { id: true, name: true, role: true } } },
        });
        io.to(conversationId).emit("message-reaction-added", {
          messageId,
          conversationId,
          reaction: { id: reaction.id, emoji: reaction.emoji, userId: reaction.userId, user: reaction.user },
        });
      } catch (err) {
        console.error("add-reaction error:", err);
      }
    });

    socket.on("remove-reaction", async ({ messageId, conversationId }) => {
      try {
        const reaction = await prisma.messageReaction.findFirst({
          where: { messageId, userId: socket.userId },
        });
        if (!reaction) return;
        await prisma.messageReaction.delete({ where: { id: reaction.id } });
        io.to(conversationId).emit("message-reaction-removed", {
          messageId,
          conversationId,
          userId: socket.userId,
          emoji: reaction.emoji,
        });
      } catch (err) {
        console.error("remove-reaction error:", err);
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);
      io.emit("user-offline", socket.userId);
    });
  });

  const PORT = parseInt(process.env.PORT, 10) || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
