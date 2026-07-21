import type { Server, Socket } from "socket.io";

const userSockets = new Map<string, Set<string>>();

export const presenceService = {
  handleConnection(io: Server, socket: Socket) {
    socket.on("user:online", (userId: string) => {
      if (!userId) return;
      socket.data.userId = userId;
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
      io.emit("presence:update", { userId, online: true });
    });

    socket.on("user:away", (userId: string) => {
      io.emit("presence:update", { userId, online: false });
    });
  },

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        const io = socket.nsp as unknown as Server;
        io.emit("presence:update", { userId, online: false });
      }
    }
  },
};
