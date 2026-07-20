import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { useCamera } from "../../hooks/useCamera";

interface CameraRecorderProps {
  onRecorded: (blob: Blob) => void;
  onCancel?: () => void;
}

const COUNTDOWN_SECONDS = 5;
const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function CameraRecorder({ onRecorded, onCancel }: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { stream, isReady, error, permission, start: startCamera, stop: stopCamera } = useCamera();
  const [phase, setPhase] = useState<"idle" | "countdown" | "recording" | "processing">("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  function stopAll() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopCamera();
  }

  function selectMimeType(): string | undefined {
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t));
  }

  async function startRecording() {
    await startCamera();
  }

  useEffect(() => {
    if (!isReady || !stream || phase !== "idle") return;

    chunksRef.current = [];
    const mimeType = selectMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blobType = recorder.mimeType || stream.getTracks()[0]?.label || "video/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      stopCamera();
      setPhase("idle");
      onRecorded(blob);
    };

    recorder.start();
    setPhase("countdown");
    setCountdown(COUNTDOWN_SECONDS);

    let remaining = COUNTDOWN_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    stopTimeoutRef.current = setTimeout(() => {
      if (recorder.state !== "inactive") {
        setPhase("processing");
        recorder.stop();
      }
    }, COUNTDOWN_SECONDS * 1000);
  }, [isReady, stream, phase, onRecorded, stopCamera]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onRecorded(file);
  }

  const ringOffset = RING_CIRCUMFERENCE * (1 - countdown / COUNTDOWN_SECONDS);
  const cameraDenied = permission === "denied" || error;

  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

      {phase === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {cameraDenied ? (
            <>
              <p className="max-w-xs text-white/70">
                Camera access is blocked. Upload a 5-second silent video from your gallery instead.
              </p>
              <label className="cursor-pointer rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white active:bg-brand-600">
                Choose from gallery
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          ) : (
            <>
              <Button onClick={startRecording} className="text-lg">
                Hold to record 5s
              </Button>
              <label className="cursor-pointer text-sm text-white/60 underline">
                Or upload from gallery
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-white/50">
              Cancel
            </button>
          )}
        </div>
      )}

      {(phase === "countdown" || phase === "recording" || phase === "processing") && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                stroke="#f43f5e"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="text-4xl font-bold">{countdown}</span>
          </div>
          <p className="absolute bottom-12 text-sm font-medium text-white/80">
            {phase === "processing" ? "Finishing..." : "Recording..."}
          </p>
        </div>
      )}
    </div>
  );
}
