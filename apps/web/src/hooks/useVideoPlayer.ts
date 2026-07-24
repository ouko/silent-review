import { useRef, useState, useEffect, useCallback } from "react";

interface UseVideoPlayerOptions {
  src: string;
  shouldPlay: boolean;
  preload?: boolean;
}

export function useVideoPlayer({ src, shouldPlay, preload = false }: UseVideoPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = preload ? "auto" : "metadata";

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => setError("Could not load video");

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, [src, preload]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay blocked or source not ready; user gesture may be needed.
        });
      }
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [shouldPlay]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const reload = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    video.load();
    if (shouldPlay) {
      video.play().catch(() => {});
    }
  }, [shouldPlay]);

  return { videoRef, isPlaying, isBuffering, error, togglePlay, reload };
}
