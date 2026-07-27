import { useState, useRef, useEffect } from "react";
import { useExport } from "../../hooks/useExport";
import { ExportProgress } from "./ExportProgress";
import { QRCode } from "./QRCode";
import { listPlatforms, type PlatformId } from "../../lib/export/platformTemplates";
import { buildShareUrl } from "../../lib/share/urlBuilder";
import { copyToClipboard } from "../../lib/share/copyToClipboard";
import { X, Download, Share2, Link2 } from "lucide-react";

interface ShareSheetProps {
  reviewId: string;
  videoUrl: string;
  productName: string;
  rating?: number;
  deepLinkUrl: string;
  onClose: () => void;
}

export function ShareSheet({ reviewId, videoUrl, productName, rating, deepLinkUrl, onClose }: ShareSheetProps) {
  const exportApi = useExport();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("tiktok");
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Focus the first focusable element inside the sheet.
    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = Array.from(focusable).filter(
        (el) => !(el as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled
      );
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  async function handleExport() {
    await exportApi.generate({ videoUrl, platform: selectedPlatform, productName, rating });
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({
        title: "Silent Review",
        text: `Can you guess the rating for ${productName}?`,
        url: deepLinkUrl,
      }).catch(() => {});
    }
  }

  async function handleCopyLink() {
    const url = buildShareUrl(reviewId, productName, { provider: "copy" });
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy failures (e.g. user denied permission).
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="w-full max-w-md rounded-2xl bg-zinc-900 p-5 text-white"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="share-title" className="text-lg font-bold">Share review</h2>
          <button
            onClick={onClose}
            aria-label="Close share sheet"
            className="rounded-full p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-5 gap-2">
          {listPlatforms().map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`rounded-xl px-2 py-3 text-xs font-semibold transition-colors ${
                selectedPlatform === p.id
                  ? "bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="mb-4 space-y-3">
          <ExportProgress progress={exportApi.progress} />
          {exportApi.blobUrl && (
            <video src={exportApi.blobUrl} className="max-h-48 w-full rounded-xl" controls muted />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            disabled={exportApi.progress.status === "encoding"}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3 font-semibold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            {exportApi.blobUrl
              ? "Regenerate"
              : selectedPlatform === "tiktok"
              ? "Export for TikTok"
              : "Export video"}
          </button>
          <button
            onClick={() => exportApi.download(`silent-review-${reviewId}-${selectedPlatform}.webm`)}
            disabled={!exportApi.blobUrl}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Save video
          </button>
        </div>

        <button
          onClick={() => setShowQR((s) => !s)}
          className="mt-3 w-full rounded-xl bg-white/5 py-2 text-sm font-medium text-white/70"
        >
          {showQR ? "Hide product sticker" : "Generate product sticker"}
        </button>

        {showQR && (
          <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
            <QRCode value={deepLinkUrl} size={160} />
          </div>
        )}

        <button
          onClick={handleCopyLink}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white"
        >
          <Link2 className="h-4 w-4" />
          {copied ? "Link copied!" : "Copy link"}
        </button>

        {typeof navigator.share === "function" && (
          <button
            onClick={handleNativeShare}
            className="mt-3 w-full rounded-xl border border-white/20 py-3 text-sm font-semibold text-white"
          >
            Share link
          </button>
        )}
      </div>
    </div>
  );
}
