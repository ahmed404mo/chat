import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token, platform } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId: user.id, platform: platform || "android" },
      create: { token, userId: user.id, platform: platform || "android" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push register error:", err);
    return NextResponse.json({ error: "Failed to register token" }, { status: 500 });
  }
}
