import { NextResponse } from "next/server";
import { getUserFromToken, type JwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  let user = getUserFromToken(req);
  if (!user && token) {
    try { user = jwt.verify(token, process.env.USER_TOKEN_SECRET_KEY!) as JwtPayload; } catch {}
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileUrl = searchParams.get("url");
  if (!fileUrl) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    const publicId = getPublicIdFromUrl(fileUrl);
    if (!publicId) {
      return NextResponse.json({ error: "Could not extract public ID" }, { status: 400 });
    }

    const formatMatch = fileUrl.match(/\.(\w+)(?:\?.+)?$/);
    const format = formatMatch ? formatMatch[1] : undefined;

    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      secure: true,
      resource_type: "image",
      type: "upload",
      format,
    });
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
