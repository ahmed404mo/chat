import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = process.env.ORIGINS?.split(",").map(o => o.trim()) || [
  "http://localhost:3000",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "file://",
];

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const isApi = req.nextUrl.pathname.startsWith("/api");

  if (!isApi) return NextResponse.next();

  const corsOrigin = allowedOrigins.includes("*")
    ? "*"
    : allowedOrigins.includes(origin)
      ? origin
      : "";

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin || "*",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const res = NextResponse.next();

  if (corsOrigin) {
    res.headers.set("Access-Control-Allow-Origin", corsOrigin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  return res;
}

export const config = {
  matcher: "/api/:path*",
};
