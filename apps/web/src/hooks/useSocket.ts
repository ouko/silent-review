import { useEffect, useRef, useCallback } from "react";
import { getSocket, disconnectSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

export interface UseSocketReturn {
  socket: Socket;
  emit: <T = unknown>(event: string, payload?: T) => void;
  on: <T = unknown>(event: string, handler: (data: T) => void) => () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();
    return () => {
      // We do not disconnect on every unmount to keep a stable connection;
      // disconnect only on app-level logout if needed.
    };
  }, []);

  const emit = useCallback(<T = unknown>(event: string, payload?: T) => {
    socketRef.current.emit(event, payload);
  }, []);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    socketRef.current.on(event, handler as (data: unknown) => void);
    return () => {
      socketRef.current.off(event, handler as (data: unknown) => void);
    };
  }, []);

  return { socket: socketRef.current, emit, on };
}

export { disconnectSocket };
