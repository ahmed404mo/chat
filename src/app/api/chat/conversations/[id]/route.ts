import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken, canManageChats } from "@/lib/auth";
import { deleteFile, deleteFiles, getPublicIdFromUrl } from "@/lib/cloudinary";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageChats(user.role)) {
    return NextResponse.json(
      { error: "Only Admin and HR can rename groups" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, any> = {};

    if (body.title !== undefined) {
      if (!body.title?.trim()) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }
      data.title = body.title.trim();
    }

    if (body.imageUrl !== undefined) {
      data.imageUrl = body.imageUrl;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data,
    });

    try { await pusher.trigger(`private-conversation-${id}`, "conversation-updated", {
      conversationId: id,
      ...data,
    }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    console.error("Rename conversation error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to rename conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageChats(user.role)) {
    return NextResponse.json(
      { error: "Only Admin and HR can delete groups" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Delete group image from Cloudinary if it exists
    if (conversation.imageUrl) {
      const publicId = getPublicIdFromUrl(conversation.imageUrl);
      if (publicId) {
        await deleteFile(publicId);
      }
    }

    // Collect all Cloudinary publicIds from attachments in this conversation
    const attachments = await prisma.attachment.findMany({
      where: { message: { conversationId: id } },
      select: { publicId: true },
    });

    // التعديل الصحيح لتفادي خطأ الـ any:
    const publicIds = attachments
      .map((a: { publicId: string | null }) => a.publicId)
      .filter((pid: string | null): pid is string => pid !== null);

    // Delete files from Cloudinary
    if (publicIds.length > 0) {
      await deleteFiles(publicIds);
    }

    // Delete the conversation (cascade handles messages, participants, inviteCodes, attachments)
    await prisma.conversation.delete({ where: { id } });

    try { await pusher.trigger(`private-conversation-${id}`, "conversation-deleted", { conversationId: id }); } catch (e) { console.error("pusher trigger error:", e); }

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Delete conversation error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}