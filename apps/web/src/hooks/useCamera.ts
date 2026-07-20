import { useState, useCallback, useEffect } from "react";

export type CameraPermission = "prompt" | "granted" | "denied" | "unknown";

export interface UseCameraResult {
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
  permission: CameraPermission;
  start: () => Promise<void>;
  stop: () => void;
}

export function useCamera(): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<CameraPermission>("prompt");

  const stop = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setIsReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        setPermission(status.state as CameraPermission);
        status.addEventListener("change", () => {
          setPermission(status.state as CameraPermission);
        });
      } catch {
        setPermission("unknown");
      }
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      setIsReady(true);
      setPermission("granted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera unavailable";
      setError(message);
      setPermission("denied");
      setIsReady(false);
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { stream, isReady, error, permission, start, stop };
}
