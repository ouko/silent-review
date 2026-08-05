import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DailyDropReviewUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface DailyDropReviewProduct {
  id: string;
  name: string;
  category: string;
}

export interface DailyDropReview {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productTag: string | null;
  rating: number;
  duration: number;
  guessCount: number;
  createdAt: string;
  user: DailyDropReviewUser;
  product: DailyDropReviewProduct;
}

export interface DailyDropData {
  id: string;
  date: string;
  reviewId: string;
  review: DailyDropReview;
  isOverride: boolean;
  createdAt: string;
  alreadyGuessed: boolean;
}

export interface TodaysDailyDropResponse {
  dailyDrop: DailyDropData;
  alreadyGuessed: boolean;
}

export interface ArchiveItemReview {
  id: string;
  thumbnailUrl: string | null;
  productTag: string | null;
  rating: number;
  product: { name: string; category: string };
}

export interface ArchiveItem {
  id: string;
  date: string;
  reviewId: string;
  review: ArchiveItemReview;
  isOverride: boolean;
  played?: boolean;
}

export interface ArchiveResponse {
  items: ArchiveItem[];
  nextCursor?: string;
}

export interface DailyDropAttemptResult {
  guess: {
    id: string;
    userId: string;
    reviewId: string;
    dailyDropId: string;
    guessedRating: number;
    score: number;
    isCorrect: boolean;
    createdAt: string;
  };
  score: number;
  review: DailyDropReview;
  streakUpdated: boolean;
}

export function useTodaysDailyDrop() {
  return useQuery<TodaysDailyDropResponse>({
    queryKey: ["dailydrop", "today"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data } = await api.get<TodaysDailyDropResponse>("/api/dailydrop/today");
      return data;
    },
  });
}

export function useDailyDropArchive() {
  return useQuery<ArchiveResponse>({
    queryKey: ["dailydrop", "archive"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data } = await api.get<ArchiveResponse>("/api/dailydrop/archive");
      return data;
    },
  });
}

export function useDailyDropAttempt() {
  const queryClient = useQueryClient();

  return useMutation<DailyDropAttemptResult, Error, { dailyDropId: string; guessedRating: number }>({
    mutationFn: async ({ dailyDropId, guessedRating }) => {
      const { data } = await api.post<DailyDropAttemptResult>(`/api/dailydrop/${dailyDropId}/attempt`, {
        guessedRating,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailydrop", "today"] });
      queryClient.invalidateQueries({ queryKey: ["dailydrop", "archive"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
    },
  });
}
