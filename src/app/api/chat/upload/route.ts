import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { uploadFile } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain", "text/csv",
  "application/zip", "application/x-rar-compressed",
  "application/json", "application/xml",
  "audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg", "audio/aac", "audio/x-m4a"
];

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file || !conversationId) {
      return NextResponse.json(
        { error: "File and conversationId are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    const participation = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: user.id },
    });
    if (!participation) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const result = await uploadFile(file);

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      fileName: file.name,
      fileSize: result.bytes,
      mimeType: file.type,
    });
  } catch (err) {
    console.error("File upload error:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
