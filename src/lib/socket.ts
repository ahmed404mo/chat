"use client";

import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;
let subscribedChannels: Set<string> = new Set();

export function getSocket(): Pusher | null {
  return pusherClient;
}

export function getPusherClient(): Pusher | null {
  return pusherClient;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function connectSocket(token: string, onAuthError?: () => void): Pusher {
  if (isTokenExpired(token)) {
    onAuthError?.();
    if (pusherClient) {
      pusherClient.disconnect();
      pusherClient = null;
      subscribedChannels.clear();
    }
    return null as any;
  }

  if (pusherClient) {
    pusherClient.disconnect();
    subscribedChannels.clear();
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

export function disconnectSocket(): void {
  if (pusherClient) {
    subscribedChannels.forEach((channelName) => {
      pusherClient?.unsubscribe(channelName);
    });
    subscribedChannels.clear();
    pusherClient.disconnect();
    pusherClient = null;
  }
}

export function subscribeToChannel(channelName: string): any {
  if (!pusherClient) return null;
  if (subscribedChannels.has(channelName)) return null;
  subscribedChannels.add(channelName);
  return pusherClient.subscribe(channelName);
}

export function unsubscribeFromChannel(channelName: string): void {
  if (!pusherClient) return;
  subscribedChannels.delete(channelName);
  pusherClient.unsubscribe(channelName);
}
