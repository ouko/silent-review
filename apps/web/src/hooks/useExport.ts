import { useState } from "react";
import { renderShareableVideo, type RenderProgress } from "../lib/export/canvasRenderer";
import type { PlatformId } from "../lib/export/platformTemplates";

export function useExport() {
  const [progress, setProgress] = useState<RenderProgress>({ status: "loading", progress: 0 });
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  async function generate(options: {
    videoUrl: string;
    platform: PlatformId;
    productName: string;
    rating?: number;
  }) {
    setProgress({ status: "loading", progress: 0 });
    setBlobUrl(null);
    const blob = await renderShareableVideo({
      ...options,
      onProgress: setProgress,
    });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return { blob, url };
  }

  function download(filename?: string) {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "silent-review.webm";
    a.click();
  }

  function cleanup() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }

  return { generate, download, cleanup, progress, blobUrl };
}
