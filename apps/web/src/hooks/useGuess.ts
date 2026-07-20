import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

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

export function useGuess(reviewId: string) {
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const submitMutation = useMutation<GuessResult, Error, number>({
    mutationFn: async (guessedRating) => {
      const { data } = await api.post(`/api/guesses/${reviewId}`, { guessedRating });
      return data;
    },
    onSuccess: () => {
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
