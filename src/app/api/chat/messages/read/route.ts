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

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        readBy: { none: { userId: user.id } },
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

    await pusher.trigger(`private-conversation-${conversationId}`, "messages-read", {
      conversationId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      readAt: now.toISOString(),
      messageIds: unreadMessages.map((m) => m.id),
    });

    return NextResponse.json({ success: true, readCount: unreadMessages.length });
  } catch (err) {
    console.error("mark-read error:", err);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
