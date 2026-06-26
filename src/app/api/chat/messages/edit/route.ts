import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken } from "@/lib/auth";

export async function PATCH(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messageId, content, conversationId } = await req.json();
    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const message = await prisma.message.findFirst({
      where: { id: messageId, senderId: user.id },
    });
    if (!message) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

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

    await pusher.trigger(`private-conversation-${conversationId}`, "message-edited", updated);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("edit-message error:", err);
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}
