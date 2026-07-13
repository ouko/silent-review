import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.WEB_APP_URL ?? "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", () => {});

  return io;
}
