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
    const { messageId, conversationId, forEveryone } = await req.json();

    const message = await prisma.message.findFirst({
      where: { id: messageId },
    });
    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message.senderId !== user.id) {
      return NextResponse.json({ error: "Not your message" }, { status: 403 });
    }

    if (forEveryone) {
      await prisma.message.delete({ where: { id: messageId } });
      await pusher.trigger(`private-conversation-${conversationId}`, "message-deleted", { messageId, conversationId });
    } else {
      const placeholder = await prisma.message.update({
        where: { id: messageId },
        data: { content: "🗑️ This message was deleted", attachments: { set: [] } },
      });
      await pusher.trigger(`private-conversation-${conversationId}`, "message-edited", placeholder);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete-message error:", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
