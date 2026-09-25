import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";

let socket: Socket | null = null;

function getSocketURL(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      return envUrl;
    }
  }
  if (import.meta.env.DEV) return "http://localhost:3001";
  return window.location.origin;
}

export function connectSocket(): Socket {
  if (socket && socket.connected) return socket;
  const token = getAccessToken();
  if (!token) throw new Error("No access token for socket");

  socket = io(getSocketURL(), {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
