import { useRef, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  const timingStartedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const { stream, isReady, error, permission, start: startCamera, stop: stopCamera } = useCamera();
  const [phase, setPhase] = useState<"idle" | "countdown" | "recording" | "processing">("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isPressed, setIsPressed] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const stopWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (stopWatchdogRef.current) clearTimeout(stopWatchdogRef.current);
    recorderRef.current?.stop();
    recorderRef.current = null;
    stopCamera();
  }

  function resetToIdle() {
    setPhase("idle");
    setCountdown(COUNTDOWN_SECONDS);
    setIsPressed(false);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    stopWatchdogRef.current = setTimeout(() => {
      if (recorderRef.current === recorder) {
        recorder.onstop?.(new Event("stop"));
      }
    }, 3000);
    try {
      recorder.requestData();
    } catch {
      // ignore
    }
    try {
      recorder.stop();
    } catch {
      // watchdog handles it
    }
  }

  function handleCancelRecording() {
    completedRef.current = false;
    stopAll();
    resetToIdle();
  }

  function selectMimeType(): string | undefined {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const types = isIOS
      ? ["video/mp4", "video/webm"]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    return types.find((t) => MediaRecorder.isTypeSupported(t));
  }

  function handlePressStart() {
    if (phase !== "idle") return;
    setRecordError(null);
    setIsPressed(true);
    startCamera();
  }

  function handlePressEnd() {
    setIsPressed(false);
    if (phase === "countdown" || phase === "recording" || phase === "processing") {
      stopRecording();
    }
  }

  useEffect(() => {
    if (!isReady || !stream || phase !== "idle" || !isPressed) return;

    chunksRef.current = [];
    completedRef.current = false;
    timingStartedRef.current = false;
    const mimeType = selectMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size <= 0) return;
      chunksRef.current.push(e.data);
      if (!timingStartedRef.current) {
        timingStartedRef.current = true;
        stopTimeoutRef.current = setTimeout(() => {
          if (recorder.state !== "inactive") {
            completedRef.current = true;
            setPhase("processing");
            stopRecording();
          }
        }, COUNTDOWN_SECONDS * 1000);
      }
    };

    recorder.onstop = () => {
      if (!activeRef.current) return;
      const blobType = recorder.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      stopCamera();
      const completed = completedRef.current;
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      if (stopWatchdogRef.current) clearTimeout(stopWatchdogRef.current);
      recorderRef.current = null;
      resetToIdle();
      if (completed) {
        if (blob.size < 50 * 1024) {
          setRecordError("The recording didn't save. Please try again.");
        } else {
          onRecorded(blob);
        }
      }
    };

    recorder.start(1000);
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
  }, [isReady, stream, phase, isPressed, onRecorded, stopCamera]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onRecorded(file);
  }

  const ringOffset = RING_CIRCUMFERENCE * (1 - countdown / COUNTDOWN_SECONDS);
  const cameraDenied = permission === "denied" || error;

  return (
    <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-void">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

      {phase === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-4 p-6 pb-12 text-center bg-gradient-to-t from-void via-void/40 to-transparent">
          {cameraDenied ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <Upload className="h-7 w-7 text-white/80" />
              </div>
              <p className="max-w-xs text-white/70">Camera access is blocked. Upload a 5-second silent video instead.</p>
              <label className="btn-pill cursor-pointer bg-gradient-to-r from-primary-500 to-accent-pink text-white shadow-glow">
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
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                className="group relative flex h-24 w-48 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-pink text-lg font-bold text-white shadow-glow transition-shadow hover:shadow-glow-lg"
              >
                <span className="absolute inset-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/10" />
                <Video className="h-5 w-5" />
                Hold to record
              </motion.button>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white/60 transition-colors hover:text-white">
                <Upload className="h-4 w-4" />
                Or upload from gallery
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {recordError && <p className="text-sm text-red-400">{recordError}</p>}
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm font-semibold text-white/50 transition-colors hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {(phase === "countdown" || phase === "recording" || phase === "processing") && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/50 backdrop-blur-sm">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={RING_RADIUS} stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
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
            <span className="font-heading text-4xl font-black tracking-tighter text-white">{countdown}</span>
          </div>
          <p className="absolute bottom-12 text-sm font-bold uppercase tracking-[0.05em] text-white/80">
            {phase === "processing" ? "Finishing..." : "Recording..."}
          </p>
          <button
            onClick={handleCancelRecording}
            className="absolute bottom-24 tap-48 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
