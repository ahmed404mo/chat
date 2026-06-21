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
    return NextResponse.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  const participation = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: user.id },
  });
  if (!participation) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const take = 50;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: true,
      reactions: { include: { user: { select: { id: true, name: true, role: true } } } },
      readBy: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: hasMore ? messages[0]?.id : null,
    hasMore,
  });
}
