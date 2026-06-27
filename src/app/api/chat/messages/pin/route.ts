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
    const { messageId, conversationId } = await req.json();

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { pinned: !message.pinned },
    });

    try { await pusher.trigger(`private-conversation-${conversationId}`, "message-pinned", {
      messageId,
      conversationId,
      pinned: updated.pinned,
    }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json({ success: true, pinned: updated.pinned });
  } catch (err) {
    console.error("pin-message error:", err);
    return NextResponse.json({ error: "Failed to pin message" }, { status: 500 });
  }
}
