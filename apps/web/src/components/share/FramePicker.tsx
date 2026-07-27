import { useRef, useState, useEffect } from "react";
import { captureFrame } from "../../lib/export/canvasRenderer";

interface FramePickerProps {
  videoUrl: string;
  onSelect: (blob: Blob, time: number) => void;
}

export function FramePicker({ videoUrl, onSelect }: FramePickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      setDuration(video.duration);
      setCurrentTime(video.duration * 0.25);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [videoUrl]);

  async function handleCapture() {
    setCapturing(true);
    try {
      const blob = await captureFrame(videoUrl, currentTime, "tiktok");
      onSelect(blob, currentTime);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        src={videoUrl}
        className="max-h-64 w-full rounded-xl bg-black"
        muted
        playsInline
        crossOrigin="anonymous"
      />
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={(e) => {
          const t = Number(e.target.value);
          setCurrentTime(t);
          if (videoRef.current) videoRef.current.currentTime = t;
        }}
        className="w-full accent-rose-500"
      />
      <button
        onClick={handleCapture}
        disabled={capturing || !duration}
        className="w-full rounded-xl bg-white/10 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
      >
        {capturing ? "Capturing…" : "Use this frame as TikTok cover"}
      </button>
    </div>
  );
}
