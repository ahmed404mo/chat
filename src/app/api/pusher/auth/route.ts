import { NextResponse } from "next/server";
import { pusher } from "@/lib/pusher-server";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const socketId = body.socket_id as string;
  const channelName = body.channel_name as string;

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  if (channelName.startsWith("presence-")) {
    const presenceData = {
      user_id: user.id,
      user_info: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
    const auth = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(auth);
  }

  if (channelName.startsWith("private-")) {
    const auth = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  }

  return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
}
