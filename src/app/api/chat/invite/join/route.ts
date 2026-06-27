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
    const { code } = await req.json();

    console.log("[JOIN VIA INVITE] Received code:", JSON.stringify(code));
    console.log(
      "[JOIN VIA INVITE] Code length:",
      code?.length,
      "Code type:",
      typeof code,
    );

    if (!code) {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 },
      );
    }

    const normalizedCode = code.trim().toUpperCase();
    console.log(
      "[JOIN VIA INVITE] Normalized code:",
      JSON.stringify(normalizedCode),
      "Length:",
      normalizedCode.length,
    );

    const invite = await prisma.inviteCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!invite) {
      // DEBUG: list all invite codes in the DB for comparison
      const allCodes = await prisma.inviteCode.findMany({
        select: {
          id: true,
          code: true,
          conversationId: true,
          maxUses: true,
          usedCount: true,
          isActive: true,
          expiresAt: true,
        },
      });
      console.log(
        "[JOIN VIA INVITE] Code NOT found in DB. All stored codes:",
        JSON.stringify(allCodes),
      );
      console.log(
        "[JOIN VIA INVITE] Searched for code:",
        JSON.stringify(normalizedCode),
      );
      console.log(
        "[JOIN VIA INVITE] Exact match check:",
        allCodes.map((c: { code: string }) => ({
          code: c.code,
          match: c.code === normalizedCode,
          codeLen: c.code.length,
          inputLen: normalizedCode.length,
          codeUpperCase: c.code === normalizedCode.toUpperCase(),
          inputUpperCase: c.code.toUpperCase() === normalizedCode,
        })),
      );

      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 },
      );
    }

    console.log(
      "[JOIN VIA INVITE] Found invite:",
      JSON.stringify({
        id: invite.id,
        code: invite.code,
        conversationId: invite.conversationId,
        usedCount: invite.usedCount,
        maxUses: invite.maxUses,
        isActive: invite.isActive,
      }),
    );

    if (!invite.isActive) {
      console.log("[JOIN VIA INVITE] Code is deactivated");
      return NextResponse.json(
        { error: "Invitation code is deactivated" },
        { status: 410 },
      );
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      console.log("[JOIN VIA INVITE] Code expired at:", invite.expiresAt);
      return NextResponse.json(
        { error: "Invitation code has expired" },
        { status: 410 },
      );
    }

    if (invite.usedCount >= invite.maxUses) {
      console.log(
        "[JOIN VIA INVITE] Code max uses reached:",
        invite.usedCount,
        "/",
        invite.maxUses,
      );
      return NextResponse.json(
        { error: "Invitation code has reached maximum uses" },
        { status: 410 },
      );
    }

    const existing = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: invite.conversationId,
        userId: user.id,
      },
    });

    if (existing) {
      return NextResponse.json({
        message: "Already a participant",
        conversationId: invite.conversationId,
      });
    }

    await prisma.$transaction([
      prisma.conversationParticipant.create({
        data: {
          conversationId: invite.conversationId,
          userId: user.id,
        },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    try { await pusher.trigger(`private-conversation-${invite.conversationId}`, "member-added", {
      conversationId: invite.conversationId,
      addedUserIds: [user.id],
      addedUsers: [{ id: user.id, name: user.name, role: user.role }],
    }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json(
      {
        message: "Successfully joined conversation",
        conversationId: invite.conversationId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Join via invite error:", err);
    return NextResponse.json(
      { error: "Failed to join conversation" },
      { status: 500 },
    );
  }
}
