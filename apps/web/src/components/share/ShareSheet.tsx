import { useState } from "react";
import { useExport } from "../../hooks/useExport";
import { ExportProgress } from "./ExportProgress";
import { QRCode } from "./QRCode";
import { listPlatforms, type PlatformId } from "../../lib/export/platformTemplates";
import { X, Download, Share2 } from "lucide-react";

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

  async function handleExport() {
    await exportApi.generate({ videoUrl, platform: selectedPlatform, productName, rating });
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({
        title: "Silent Review",
        text: `Can you guess the rating for ${productName}?`,
        url: deepLinkUrl,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-5 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Share review</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
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
            {exportApi.blobUrl ? "Regenerate" : "Export video"}
          </button>
          <button
            onClick={() => exportApi.download(`silent-review-${reviewId}.webm`)}
            disabled={!exportApi.blobUrl}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download
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
