import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, canManageChats } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageChats(user.role)) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
