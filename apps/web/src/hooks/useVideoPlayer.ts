import { useRef, useState, useEffect, useCallback } from "react";
import { trackVideoEvent } from "../lib/views";

interface UseVideoPlayerOptions {
  src: string;
  shouldPlay: boolean;
  preload?: boolean;
  reviewId?: string;
}

export function useVideoPlayer({ src, shouldPlay, preload = false, reviewId }: UseVideoPlayerOptions) {
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
      if (reviewId) trackVideoEvent(reviewId, "view");
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => setError("Could not load video");
    const onTimeUpdate = () => {
      // Loop is on, so 'ended' never fires: count >=90% watched as complete.
      if (reviewId && video.duration > 0 && video.currentTime / video.duration >= 0.9) {
        trackVideoEvent(reviewId, "complete");
      }
    };

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [src, preload, reviewId]);

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
