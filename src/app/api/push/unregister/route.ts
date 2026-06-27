import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await prisma.deviceToken.deleteMany({ where: { token, userId: user.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push unregister error:", err);
    return NextResponse.json({ error: "Failed to unregister token" }, { status: 500 });
  }
}
