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
    const { messageId, emoji, conversationId } = await req.json();

    const reaction = await prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId: user.id } },
      update: { emoji },
      create: { messageId, userId: user.id, emoji },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    try { await pusher.trigger(`private-conversation-${conversationId}`, "message-reaction-added", {
      messageId,
      conversationId,
      reaction: { id: reaction.id, emoji: reaction.emoji, userId: reaction.userId, user: reaction.user },
    }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("add-reaction error:", err);
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messageId, conversationId } = await req.json();

    const reaction = await prisma.messageReaction.findFirst({
      where: { messageId, userId: user.id },
    });
    if (!reaction) {
      return NextResponse.json({ error: "Reaction not found" }, { status: 404 });
    }

    await prisma.messageReaction.delete({ where: { id: reaction.id } });

    try { await pusher.trigger(`private-conversation-${conversationId}`, "message-reaction-removed", {
      messageId,
      conversationId,
      userId: user.id,
      emoji: reaction.emoji,
    }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("remove-reaction error:", err);
    return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
  }
}
