import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, canManageChats } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  
  // التعديل هنا: التأكد من وجود اليوزر ووجود الـ ID بتاعه
  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized or missing User ID" }, { status: 401 });
  }

  console.log(`[GET conversations] user: ${user.id}, role: ${user.role}`);
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true, role: true } },
          attachments: true,
        },
      },
      inviteCodes: {
        where: { isActive: true },
        select: { id: true, code: true, expiresAt: true, maxUses: true, usedCount: true, isActive: true },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageChats(user.role)) {
    return NextResponse.json(
      { error: "Only Admin and HR can create conversations" },
      { status: 403 }
    );
  }

  try {
    const { participantIds, title, isGroup: clientIsGroup } = await req.json();
    if (!participantIds?.length) {
      return NextResponse.json(
        { error: "At least one participant required" },
        { status: 400 }
      );
    }

    const allIds = [...new Set([user.id, ...participantIds])];

    const isGroup = clientIsGroup !== undefined ? clientIsGroup : (Boolean(title) || allIds.length > 2);
    if (!isGroup) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: allIds[0] } } },
            { participants: { some: { userId: allIds[1] } } },
          ],
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true, role: true } } },
          },
        },
      });

      if (existingConversation) {
        return NextResponse.json({ conversation: existingConversation });
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: title || null,
        isGroup,
        createdById: user.id,
        participants: {
          create: allIds.map((userId) => ({ userId })),
        },
        inviteCodes: isGroup ? {
          create: {
            code: crypto.randomBytes(4).toString("hex").toUpperCase(),
            createdById: user.id,
            maxUses: 100,
          },
        } : undefined,
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
        inviteCodes: {
          select: { id: true, code: true, expiresAt: true, maxUses: true, usedCount: true, isActive: true },
        },
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    console.error("Create conversation error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
