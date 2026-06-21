import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { ensureUserInDefaultGroup } from "@/lib/defaultGroup";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND!, 10));

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    await ensureUserInDefaultGroup(user.id);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      process.env.USER_TOKEN_SECRET_KEY!,
      { expiresIn: parseInt(process.env.ACCESS_EXPIRES_IN!, 10) }
    );

    return NextResponse.json(
      {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
