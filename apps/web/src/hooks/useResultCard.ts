import { useState, useMemo, useCallback, useRef } from "react";
import {
  renderResultCard,
  renderResultCardAnimation,
  type ResultCardInput,
  type RenderProgress,
} from "../lib/export/resultCardRenderer";
import { buildResultCardUrl } from "../lib/share/resultCardUrl";
import { useFeatureFlag } from "./useFeatureFlag";
import { trackEvent } from "../lib/analytics";

export interface UseResultCardOptions {
  reviewId: string;
  title: string;
  subtitle: string;
  guesses: number[];
  actualRatings: number[];
  accuracy: number;
  streak: number;
  dailyDropDate?: string;
  challengeId?: string;
  prompt?: string;
}

function computeOutcome(guess: number, actual: number): "hit" | "near" | "miss" {
  const diff = Math.abs(guess - actual);
  if (diff === 0) return "hit";
  if (diff === 1) return "near";
  return "miss";
}

export function useResultCard(options: UseResultCardOptions) {
  const {
    reviewId,
    title,
    subtitle,
    guesses,
    actualRatings,
    accuracy,
    streak,
    dailyDropDate,
    challengeId,
    prompt,
  } = options;

  const { enabled: layoutV2 } = useFeatureFlag("result_card_layout_v2");
  const layout = layoutV2 ? "dial" : "grid";

  const [progress, setProgress] = useState<RenderProgress>({ status: "loading", progress: 0 });
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  const outcomes = useMemo(() => {
    return guesses.map((guess, i) => computeOutcome(guess, actualRatings[i] ?? guess));
  }, [guesses, actualRatings]);

  const deepLinkUrl = useMemo(() => {
    return buildResultCardUrl({ reviewId, dailyDropDate, challengeId });
  }, [reviewId, dailyDropDate, challengeId]);

  const input = useMemo<ResultCardInput>(
    () => ({
      layout,
      title,
      subtitle,
      guesses,
      outcomes,
      accuracy,
      streak,
      prompt,
      deepLinkUrl,
    }),
    [layout, title, subtitle, guesses, outcomes, accuracy, streak, prompt, deepLinkUrl]
  );

  const cleanup = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setImageBlob(null);
    setVideoBlob(null);
  }, []);

  const generateImage = useCallback(async () => {
    setProgress({ status: "loading", progress: 0 });
    cleanup();
    const blob = await renderResultCard(input, setProgress);
    imageUrlRef.current = URL.createObjectURL(blob);
    setImageBlob(blob);
    trackEvent("share_card_created", { reviewId, platform: "result_card", layout, format: "image" });
    return blob;
  }, [input, cleanup, reviewId, layout]);

  const generateVideo = useCallback(async () => {
    setProgress({ status: "loading", progress: 0 });
    cleanup();
    const blob = await renderResultCardAnimation(input, setProgress);
    videoUrlRef.current = URL.createObjectURL(blob);
    setVideoBlob(blob);
    trackEvent("share_card_created", { reviewId, platform: "result_card", layout, format: "video" });
    return blob;
  }, [input, cleanup, reviewId, layout]);

  const shareImage = useCallback(async () => {
    const blob = imageBlob ?? (await generateImage());
    const file = new File([blob], `silent-review-result-${reviewId}.png`, { type: blob.type });

    if (navigator.canShare?.({ files: [file], url: deepLinkUrl })) {
      await navigator.share({ files: [file], url: deepLinkUrl, title: "Silent Review" });
      trackEvent("share_card_clicked", { reviewId, provider: "native", format: "image" });
    } else {
      await navigator.clipboard.writeText(`${deepLinkUrl}`);
      trackEvent("share_card_clicked", { reviewId, provider: "copy", format: "image" });
    }
  }, [imageBlob, generateImage, reviewId, deepLinkUrl]);

  const copyImage = useCallback(async () => {
    const blob = imageBlob ?? (await generateImage());
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    trackEvent("share_card_clicked", { reviewId, provider: "clipboard", format: "image" });
  }, [imageBlob, generateImage, reviewId]);

  const downloadImage = useCallback(() => {
    const blob = imageBlob ?? generateImage();
    if (blob instanceof Promise) {
      blob.then((b) => triggerDownload(b, `silent-review-result-${reviewId}.png`));
      return;
    }
    triggerDownload(blob, `silent-review-result-${reviewId}.png`);
  }, [imageBlob, generateImage, reviewId]);

  const downloadVideo = useCallback(() => {
    const blob = videoBlob ?? generateVideo();
    if (blob instanceof Promise) {
      blob.then((b) => triggerDownload(b, `silent-review-result-${reviewId}.webm`));
      return;
    }
    triggerDownload(blob, `silent-review-result-${reviewId}.webm`);
  }, [videoBlob, generateVideo, reviewId]);

  return {
    progress,
    imageBlob,
    videoBlob,
    imageUrl: imageUrlRef.current,
    videoUrl: videoUrlRef.current,
    generateImage,
    generateVideo,
    shareImage,
    copyImage,
    downloadImage,
    downloadVideo,
    cleanup,
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
