import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { FeedReview } from "./useFeed";

interface GuessResult {
  guess: {
    id: string;
    userId: string;
    reviewId: string;
    guessedRating: number;
    score: number;
    isCorrect: boolean;
    createdAt: string;
  };
}

interface RevealResult {
  reviewId: string;
  rating: number;
  totalGuesses: number;
  distribution: number[];
  guesses: Array<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    guessedRating: number;
    score: number;
  }>;
}

interface FeedPages {
  pages: Array<{ reviews: FeedReview[]; nextCursor?: string }>;
  pageParams: unknown[];
}

export function useGuess(reviewId: string) {
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const submitMutation = useMutation<GuessResult, Error, number, {
    previousReview: unknown;
    previousFeed: Array<[readonly unknown[], unknown]>;
  }>({
    mutationFn: async (guessedRating) => {
      const { data } = await api.post(`/api/guesses/${reviewId}`, { guessedRating });
      return data;
    },
    onMutate: async (_guessedRating) => {
      await queryClient.cancelQueries({ queryKey: ["review", reviewId] });
      await queryClient.cancelQueries({ queryKey: ["feed"] });

      const previousReview = queryClient.getQueryData<unknown>(["review", reviewId]);
      const previousFeed = queryClient.getQueriesData<unknown>({ queryKey: ["feed"] });

      queryClient.setQueryData(["review", reviewId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const review = old as Record<string, unknown>;
        const counts =
          typeof review.counts === "object" && review.counts
            ? (review.counts as Record<string, unknown>)
            : {};
        return {
          ...review,
          counts: {
            ...counts,
            guesses: ((counts.guesses as number | undefined) ?? 0) + 1,
          },
        };
      });

      queryClient.setQueriesData({ queryKey: ["feed"] }, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const feed = old as FeedPages;
        if (!Array.isArray(feed.pages)) return old;
        return {
          ...feed,
          pages: feed.pages.map((page) => ({
            ...page,
            reviews: page.reviews.map((review) =>
              review.id === reviewId
                ? {
                    ...review,
                    counts: {
                      ...review.counts,
                      guesses: (review.counts?.guesses ?? 0) + 1,
                    },
                  }
                : review
            ),
          })),
        };
      });

      return { previousReview, previousFeed };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousReview) {
        queryClient.setQueryData(["review", reviewId], context.previousReview);
      }
      context?.previousFeed.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
    },
  });

  async function reveal(): Promise<RevealResult> {
    const { data } = await api.get(`/api/guesses/${reviewId}/reveal`);
    return data;
  }

  return {
    selectedRating,
    setSelectedRating,
    submit: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error,
    reveal,
  };
}
