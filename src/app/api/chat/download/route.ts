import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  if (!fileUrl) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
    }
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": 'attachment; filename="file"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
