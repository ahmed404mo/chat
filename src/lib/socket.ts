"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string, onAuthError?: () => void): Socket {
  if (socket?.connected) {
    // Check if the current token is still valid
    if (isTokenExpired(token)) {
      onAuthError?.();
      return socket;
    }
    return socket;
  }

  if (isTokenExpired(token)) {
    onAuthError?.();
    if (disconnectTimeout) clearTimeout(disconnectTimeout);
    disconnectTimeout = setTimeout(() => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    }, 0);
    return socket!;
  }

  socket = io({
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
    if (
      err.message === "Invalid token" ||
      err.message === "Authentication required"
    ) {
      if (disconnectTimeout) clearTimeout(disconnectTimeout);
      disconnectTimeout = setTimeout(() => {
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      }, 100);
      onAuthError?.();
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (disconnectTimeout) clearTimeout(disconnectTimeout);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
