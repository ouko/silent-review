import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./useSocket";

interface ReviewPresence {
  reviewId: string;
  viewers: number;
}

interface ReviewRevealed {
  reviewId: string;
  rating: number;
  totalGuesses: number;
  viewerResults: unknown[];
}

export function useRealtimeReview(reviewId?: string) {
  const { emit, on } = useSocket();
  const [viewers, setViewers] = useState(0);
  const [latestReveal, setLatestReveal] = useState<ReviewRevealed | null>(null);

  const reveal = useCallback(() => {
    if (reviewId) emit("review:reveal", reviewId);
  }, [emit, reviewId]);

  useEffect(() => {
    if (!reviewId) return;
    emit("review:join", reviewId);

    const unsubPresence = on<ReviewPresence>("review:presence", (data) => {
      if (data.reviewId === reviewId) setViewers(data.viewers);
    });

    const unsubRevealed = on<ReviewRevealed>("review:revealed", (data) => {
      if (data.reviewId === reviewId) setLatestReveal(data);
    });

    return () => {
      emit("review:leave", reviewId);
      unsubPresence();
      unsubRevealed();
    };
  }, [emit, on, reviewId]);

  return { viewers, latestReveal, reveal };
}
