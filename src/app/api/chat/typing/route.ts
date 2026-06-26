import { NextResponse } from "next/server";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversationId, action } = await req.json();
    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
    }

    if (action === "typing") {
      await pusher.trigger(`private-conversation-${conversationId}`, "user-typing", {
        userId: user.id,
        name: user.name,
        conversationId,
      });
    } else if (action === "stop-typing") {
      await pusher.trigger(`private-conversation-${conversationId}`, "user-stop-typing", {
        userId: user.id,
        conversationId,
      });
    } else if (action === "recording") {
      await pusher.trigger(`private-conversation-${conversationId}`, "user-recording", {
        userId: user.id,
        conversationId,
      });
    } else if (action === "stop-recording") {
      await pusher.trigger(`private-conversation-${conversationId}`, "user-stop-recording", {
        userId: user.id,
        conversationId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("typing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
