import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken } from "@/lib/auth";
import { deleteFile } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messageId, conversationId, forEveryone } = await req.json();

    const message = await prisma.message.findFirst({
      where: { id: messageId },
      include: { attachments: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message.senderId !== user.id) {
      return NextResponse.json({ error: "Not your message" }, { status: 403 });
    }

    // Delete attachments from Cloudinary before deleting the message
    for (const a of message.attachments) {
      if (a.publicId) await deleteFile(a.publicId);
    }

    if (forEveryone) {
      await prisma.message.delete({ where: { id: messageId } });
      try { await pusher.trigger(`private-conversation-${conversationId}`, "message-deleted", { messageId, conversationId }); } catch (e) { console.error("pusher trigger error:", e); }
    } else {
      const placeholder = await prisma.message.update({
        where: { id: messageId },
        data: { content: "🗑️ This message was deleted", attachments: { set: [] } },
      });
      try { await pusher.trigger(`private-conversation-${conversationId}`, "message-edited", placeholder); } catch (e) { console.error("pusher trigger error:", e); }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete-message error:", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
