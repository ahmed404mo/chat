import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, canManageChats } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageChats(user.role)) {
    return NextResponse.json(
      { error: "Only Admin and HR can generate invite codes" },
      { status: 403 }
    );
  }

  try {
    const { conversationId, expiresInHours, maxUses } = await req.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // HR must be a participant of the conversation to generate invites
    if (user.role !== "admin") {
      const isParticipant = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: user.id },
      });
      if (!isParticipant) {
        return NextResponse.json(
          { error: "You can only generate invites for groups you are a member of" },
          { status: 403 }
        );
      }
    }

    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const resolvedMaxUses = maxUses ?? 1;

    console.log("[GENERATE INVITE] Generated code:", JSON.stringify(code), "conversationId:", conversationId, "maxUses:", resolvedMaxUses, "expiresInHours:", expiresInHours);

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        conversationId,
        createdById: user.id,
        expiresAt: expiresInHours
          ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
          : null,
        maxUses: resolvedMaxUses,
      },
    });

    console.log("[GENERATE INVITE] Saved invite:", JSON.stringify({ id: invite.id, code: invite.code, conversationId: invite.conversationId }));

    // Verify the code was actually persisted
    const verify = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
    const totalCount = await prisma.inviteCode.count();
    console.log("[GENERATE INVITE] Verification - found by id:", !!verify, "total codes in DB:", totalCount);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/join?code=${invite.code}`;

    return NextResponse.json(
      {
        invite: {
          ...invite,
          inviteLink,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Generate invite error:", err);
    return NextResponse.json(
      { error: "Failed to generate invite code" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Debug mode: test code generation + read-back
  if (searchParams.get("debug") === "1") {
    if (!canManageChats(user.role)) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const testCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const testConversationId = searchParams.get("conversationId");

    const result: Record<string, unknown> = {
      testCode,
      conversationId: testConversationId || "none",
    };

    if (testConversationId) {
      try {
        const created = await prisma.inviteCode.create({
          data: {
            code: testCode,
            conversationId: testConversationId,
            createdById: user.id,
            maxUses: 5,
          },
        });
        result.created = { id: created.id, code: created.code };

        const readBack = await prisma.inviteCode.findUnique({ where: { id: created.id } });
        result.readBack = readBack ? { id: readBack.id, code: readBack.code } : null;

        const allCodes = await prisma.inviteCode.findMany({
          select: { id: true, code: true, conversationId: true },
        });
        result.allCodes = allCodes;
      } catch (err) {
        result.error = String(err);
      }
    }

    const totalCount = await prisma.inviteCode.count();
    result.totalCount = totalCount;

    return NextResponse.json(result);
  }

  const rawCode = searchParams.get("code");
  const code = rawCode?.trim().toUpperCase() || null;

  if (!code) {
    if (canManageChats(user.role)) {
      const invites = await prisma.inviteCode.findMany({
        where: { createdById: user.id },
        include: {
          conversation: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ invites });
    }
    return NextResponse.json(
      { error: "Code parameter is required" },
      { status: 400 }
    );
  }

  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: {
      conversation: {
        select: { id: true, title: true, isGroup: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid invitation code" },
      { status: 404 }
    );
  }

  if (!invite.isActive) {
    return NextResponse.json(
      { error: "Invitation code is deactivated" },
      { status: 410 }
    );
  }

  if (invite.expiresAt && new Date() > invite.expiresAt) {
    return NextResponse.json(
      { error: "Invitation code has expired" },
      { status: 410 }
    );
  }

  if (invite.usedCount >= invite.maxUses) {
    return NextResponse.json(
      { error: "Invitation code has reached maximum uses" },
      { status: 410 }
    );
  }

  return NextResponse.json({
    valid: true,
    conversation: {
      id: invite.conversation.id,
      title: invite.conversation.title,
    },
    createdBy: invite.createdBy.name,
  });
}
