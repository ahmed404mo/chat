"use client";

import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  return pusherClient;
}

export function initPusher(token: string): Pusher {
  if (pusherClient) {
    pusherClient.disconnect();
  }

  pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: "/api/pusher/auth",
    auth: {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  });

  return pusherClient;
}

export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
}
