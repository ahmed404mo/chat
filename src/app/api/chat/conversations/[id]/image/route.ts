import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken, canManageChats } from "@/lib/auth";
import { uploadFile, deleteFile, getPublicIdFromUrl } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

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
      { error: "Only Admin and HR can change group image" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    // Delete old group image from Cloudinary if it exists
    const oldConversation = await prisma.conversation.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (oldConversation?.imageUrl) {
      const oldPublicId = getPublicIdFromUrl(oldConversation.imageUrl);
      if (oldPublicId) {
        await deleteFile(oldPublicId);
      }
    }

    const result = await uploadFile(file, "group-images");

    const updated = await prisma.conversation.update({
      where: { id },
      data: { imageUrl: result.url },
    });

    try {
      await pusher.trigger(`private-conversation-${id}`, "conversation-updated", {
        conversationId: id,
        imageUrl: result.url,
      });
    } catch (e) {
      console.error("pusher trigger error:", e);
    }

    return NextResponse.json({
      url: updated.imageUrl,
      publicId: result.publicId,
    });
  } catch (err) {
    console.error("Group image upload error:", err);
    const message =
      err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
