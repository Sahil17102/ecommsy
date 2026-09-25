import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import logger from "../config/logger.js";
import { verifyAccessToken, AuthError } from "./auth.js";

const TAG = "[Realtime]";

let io: SocketIOServer | null = null;

/** Room naming: user room = `user:<userId>`. Emit to a single seller. */
function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Attach socket.io to the HTTP server. Authenticates with same JWT as REST.
 * Handshake: `io(url, { auth: { token } })` on the client.
 */
export function initRealtime(server: HTTPServer): void {
  const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean) as string[];

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch (err) {
      if (err instanceof AuthError) return next(new Error(err.message));
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };
    socket.join(userRoom(userId));
    if (role === "admin") socket.join("admins");
    logger.info(`${TAG} connect userId=${userId} role=${role} sid=${socket.id}`);

    socket.on("disconnect", (reason) => {
      logger.info(`${TAG} disconnect userId=${userId} sid=${socket.id} reason=${reason}`);
    });
  });

  logger.info(`${TAG} initialized`);
}

/** Emit an event to a specific user (all their connected tabs). */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
}

/** Emit to all connected admins. */
export function emitToAdmins(event: string, payload: unknown): void {
  if (!io) return;
  io.to("admins").emit(event, payload);
}
