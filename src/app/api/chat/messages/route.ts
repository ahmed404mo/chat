import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const cursor = searchParams.get("cursor");

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  const take = 50;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      repliedTo: {
        include: { sender: { select: { id: true, name: true, role: true } } },
      },
      attachments: true,
      reactions: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      readBy: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = messages.length > take;
  const result = hasMore ? messages.slice(0, take) : messages;
  const nextCursor = hasMore ? result[result.length - 1]?.id : null;

  return NextResponse.json({
    messages: result.reverse(),
    nextCursor,
    hasMore,
  });
}

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content, conversationId, repliedToId, attachments: files } = await req.json();

    if (!conversationId || (!content?.trim() && (!files || files.length === 0))) {
      return NextResponse.json(
        { error: "Content and conversationId are required" },
        { status: 400 },
      );
    }

    const participation = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: user.id },
    });
    if (!participation) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content: content?.trim() || "",
        conversationId,
        senderId: user.id,
        repliedToId: repliedToId || null,
        status: "DELIVERED",
        attachments: files?.length
          ? {
              create: files.map((att: any) => ({
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
        reactions: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        readBy: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await pusher.trigger(`private-conversation-${conversationId}`, "new-message", message);

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (err) {
    console.error("Send message error:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
