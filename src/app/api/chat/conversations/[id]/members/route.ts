import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken, canManageChats } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageChats(user.role)) {
    return NextResponse.json(
      { error: "Only Admin and HR can add members" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const { userIds } = await req.json();

    if (!userIds?.length) {
      return NextResponse.json(
        { error: "At least one userId required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // HR must be a participant of the conversation to manage it
    if (user.role !== "admin") {
      const isParticipant = await prisma.conversationParticipant.findFirst({
        where: { conversationId: id, userId: user.id },
      });
      if (!isParticipant) {
        return NextResponse.json(
          { error: "You can only manage groups you are a member of" },
          { status: 403 }
        );
      }
    }

    const existingParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: id,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    // تم التأكد من تعريف نوع p صراحةً هنا
    const existingUserIds = new Set(existingParticipants.map((p: { userId: string }) => p.userId));
    
    const newUserIds = userIds.filter(
      (uid: string) => !existingUserIds.has(uid)
    );

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { message: "All users are already members", added: [] },
        { status: 200 }
      );
    }

    await prisma.conversationParticipant.createMany({
      data: newUserIds.map((userId: string) => ({
        conversationId: id,
        userId,
      })),
    });

    const addedUsers = await prisma.user.findMany({
      where: { id: { in: newUserIds } },
      select: { id: true, name: true, role: true },
    });

    const updatedConversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    await pusher.trigger(`private-conversation-${id}`, "member-added", {
      conversationId: id,
      addedUserIds: newUserIds,
      addedUsers,
    });

    return NextResponse.json(
      {
        message: `${addedUsers.length} member(s) added`,
        added: addedUsers,
        conversation: updatedConversation,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Add members error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to add members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}