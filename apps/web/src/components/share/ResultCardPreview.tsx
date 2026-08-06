import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useResultCard, type UseResultCardOptions } from "../../hooks/useResultCard";
import { ExportProgress } from "./ExportProgress";
import { X, Share2, Copy, Download, Film, Swords } from "lucide-react";

interface ResultCardPreviewProps extends UseResultCardOptions {
  open: boolean;
  onClose: () => void;
  onChallengeInstead?: () => void;
}

export function ResultCardPreview({ open, onClose, onChallengeInstead, ...options }: ResultCardPreviewProps) {
  const card = useResultCard(options);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (open) {
      card.generateImage();
    }
    return () => {
      if (!open) card.cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  async function handleCopy() {
    try {
      await card.copyImage();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors.
    }
  }

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share result"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/90"
      onPointerUp={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 p-5 text-white">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Share result</h2>
            <button
              onClick={onClose}
              aria-label="Close share result"
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt="Result card preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center text-white/50">
                <ExportProgress progress={card.progress} />
                <p className="mt-2 text-sm">Generating card...</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => card.shareImage()}
              disabled={!card.imageBlob}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3 font-semibold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              onClick={handleCopy}
              disabled={!card.imageBlob}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy image"}
            </button>
            <button
              onClick={() => card.downloadImage()}
              disabled={!card.imageBlob}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Save image
            </button>
            <button
              onClick={() => card.generateVideo()}
              disabled={card.progress.status === "encoding"}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Film className="h-4 w-4" />
              {card.videoBlob ? "Video ready" : "Make video"}
            </button>
          </div>

          {card.videoUrl && (
            <div className="mt-4">
              <video src={card.videoUrl} className="w-full rounded-xl" controls muted loop />
              <button
                onClick={() => card.downloadVideo()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-sm font-medium text-white/70"
              >
                <Download className="h-4 w-4" />
                Download video
              </button>
            </div>
          )}

          {onChallengeInstead && (
            <button
              onClick={() => {
                onClose();
                onChallengeInstead();
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white"
            >
              <Swords className="h-4 w-4" />
              Challenge a friend instead
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
