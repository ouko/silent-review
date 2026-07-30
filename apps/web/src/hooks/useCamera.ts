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

    // getUserMedia is only available in secure contexts (HTTPS or localhost).
    // Over plain HTTP (e.g. a phone on the LAN) navigator.mediaDevices is
    // undefined — fail gracefully with a friendly message instead of a raw
    // "undefined is not an object" TypeError.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? "This browser doesn't support camera recording. Upload a silent video from your gallery instead."
          : "Camera recording needs a secure (HTTPS) connection. Upload a silent video from your gallery instead."
      );
      setPermission("denied");
      setIsReady(false);
      return;
    }

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
        video: {
          facingMode: "user",
          // Request HD @ 30fps so recordings satisfy the upload quality
          // rules (min 480px shortest side, min 24fps) by default.
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsReady(true);
      setPermission("granted");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const message =
        name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permission, or upload a silent video from your gallery instead."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No usable camera was found on this device. Upload a silent video from your gallery instead."
            : "The camera couldn't be started. Upload a silent video from your gallery instead.";
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
