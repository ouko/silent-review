import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCamera } from "../../hooks/useCamera";
import { Upload, Video } from "lucide-react";

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
  const completedRef = useRef(false);
  const activeRef = useRef(true);

  const { stream, isReady, error, permission, start: startCamera, stop: stopCamera } = useCamera();
  const [phase, setPhase] = useState<"idle" | "countdown" | "recording" | "processing">("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopAll();
    };
  }, []);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    recorderRef.current?.stop();
    recorderRef.current = null;
    stopCamera();
  }

  function resetToIdle() {
    setPhase("idle");
    setCountdown(COUNTDOWN_SECONDS);
    setIsPressed(false);
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

  function handlePressStart() {
    if (phase !== "idle") return;
    setIsPressed(true);
    startCamera();
  }

  function handlePressEnd() {
    setIsPressed(false);
    if (phase === "countdown" || phase === "recording") {
      recorderRef.current?.stop();
    }
  }

  useEffect(() => {
    if (!isReady || !stream || phase !== "idle" || !isPressed) return;

    chunksRef.current = [];
    completedRef.current = false;
    const mimeType = selectMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (!activeRef.current) return;
      const blobType = recorder.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      stopCamera();
      const completed = completedRef.current;
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      recorderRef.current = null;
      resetToIdle();
      if (completed) {
        onRecorded(blob);
      }
    };

    recorder.start();
    setPhase("countdown");
    setCountdown(COUNTDOWN_SECONDS);

    let remaining = COUNTDOWN_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0 && timerRef.current) {
        completedRef.current = true;
        clearInterval(timerRef.current);
      }
    }, 1000);

    stopTimeoutRef.current = setTimeout(() => {
      if (recorder.state !== "inactive") {
        completedRef.current = true;
        setPhase("processing");
        recorder.stop();
      }
    }, COUNTDOWN_SECONDS * 1000);
  }, [isReady, stream, phase, isPressed, onRecorded, stopCamera]);

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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <Upload className="h-6 w-6 text-white/80" />
              </div>
              <p className="max-w-xs text-white/70">
                Camera access is blocked. Upload a 5-second silent video from your gallery instead.
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 px-6 py-3 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90">
                <Upload className="h-4 w-4" />
                Choose from gallery
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          ) : (
            <>
              <motion.button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handlePressStart();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handlePressEnd();
                }}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    handlePressStart();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    handlePressEnd();
                  }
                }}
                onBlur={handlePressEnd}
                aria-pressed={isPressed}
                whileTap={{ scale: 0.97 }}
                className="flex min-h-[3.5rem] min-w-[12rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 px-8 text-lg font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90"
              >
                <Video className="h-5 w-5" />
                Hold to record 5s
              </motion.button>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white/60 transition-colors hover:text-white">
                <Upload className="h-4 w-4" />
                Or upload from gallery
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {onCancel && (
            <button onClick={onCancel} className="text-sm font-semibold text-white/50 transition-colors hover:text-white">
              Cancel
            </button>
          )}
        </div>
      )}

      {(phase === "countdown" || phase === "recording" || phase === "processing") && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
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
                stroke="url(#countdownGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="text-4xl font-black tracking-tighter text-white">{countdown}</span>
          </div>
          <p className="absolute bottom-12 text-sm font-bold uppercase tracking-widest text-white/80">
            {phase === "processing" ? "Finishing..." : "Recording..."}
          </p>
        </div>
      )}
    </div>
  );
}
