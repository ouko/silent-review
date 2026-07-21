import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/index.js";
import { reviewRoomHandler } from "./review.room.js";
import { presenceService } from "./presence.service.js";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.WEB_APP_URL,
      credentials: true,
    },
  });

  try {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    console.warn("Redis adapter not available; running in single-instance mode", err);
  }

  io.on("connection", (socket: Socket) => {
    reviewRoomHandler(io!, socket);
    presenceService.handleConnection(io!, socket);

    socket.on("disconnect", () => {
      presenceService.handleDisconnect(socket);
    });
  });

  return io;
}

export function getSocketServer(): Server | null {
  return io;
}
