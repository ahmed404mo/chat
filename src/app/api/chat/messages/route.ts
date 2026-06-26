import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const { content, conversationId, repliedToId } = await req.json();

    if (!content || !conversationId) {
      return NextResponse.json(
        { error: "Content and conversationId are required" },
        { status: 400 },
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        conversationId,
        senderId: user.id,
        repliedToId: repliedToId || null,
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

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("Send message error:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
