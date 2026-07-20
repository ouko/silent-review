import { useRef, useState } from "react";
import { Button } from "../ui/Button";

interface CameraRecorderProps {
  onRecorded: (blob: Blob) => void;
  onCancel?: () => void;
}

export function CameraRecorder({ onRecorded, onCancel }: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        if (videoRef.current) videoRef.current.srcObject = null;
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(blob);
      };

      recorder.start();
      setRecording(true);
      setCountdown(5);

      let remaining = 5;
      const interval = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          if (recorder.state !== "inactive") recorder.stop();
          setRecording(false);
        }
      }, 1000);
    } catch {
      setError("Camera access denied. Use the file picker below to upload a 5s silent video.");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onRecorded(file);
  }

  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />
      {!recording && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
          <Button onClick={startRecording}>Start 5s recording</Button>
          <label className="cursor-pointer text-sm text-white/60 underline">
            Or upload from gallery
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          </label>
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-white/50">
              Cancel
            </button>
          )}
        </div>
      )}
      {recording && (
        <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-lg font-bold">
          {countdown}
        </div>
      )}
    </div>
  );
}
