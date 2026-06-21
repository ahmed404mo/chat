import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export type Role = "admin" | "hr" | "employee" | "user";

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}

export function getUserFromToken(req: Request): JwtPayload | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(
      auth.slice(7),
      process.env.USER_TOKEN_SECRET_KEY!
    ) as JwtPayload;
  } catch {
    return null;
  }
}

const MANAGER_ROLES: Role[] = ["admin", "hr"];

export function canManageChats(role: Role): boolean {
  return MANAGER_ROLES.includes(role);
}

export function requireRole(...roles: Role[]) {
  return (user: JwtPayload | null): NextResponse | null => {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!roles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
    return null;
  };
}
