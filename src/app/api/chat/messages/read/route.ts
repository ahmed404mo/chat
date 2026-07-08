import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const readMsgIds = (await prisma.messageRead.findMany({
      where: { userId: user.id, message: { conversationId } },
      select: { messageId: true },
    })).map(r => r.messageId);
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        ...(readMsgIds.length ? { id: { notIn: readMsgIds } } : {}),
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) {
      return NextResponse.json({ success: true, readCount: 0 });
    }

    const now = new Date();
    await prisma.messageRead.createMany({
      data: unreadMessages.map((m) => ({
        messageId: m.id,
        userId: user.id,
        readAt: now,
      })),
      skipDuplicates: true,
    });

    try { await pusher.trigger(`private-conversation-${conversationId}`, "messages-read", {
      conversationId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      readAt: now.toISOString(),
      messageIds: unreadMessages.map((m) => m.id),
    }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json({ success: true, readCount: unreadMessages.length });
  } catch (err) {
    console.error("mark-read error:", err);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
