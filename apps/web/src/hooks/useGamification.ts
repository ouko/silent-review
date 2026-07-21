import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface GamificationState {
  streakDays: number;
  longestStreak: number;
  totalPoints: number;
  totalReviews: number;
  totalGuesses: number;
  rank: number;
  totalRanked: number;
  achievements: {
    id: string;
    unlockedAt: string;
    achievement: { slug: string; name: string; description: string; iconUrl: string | null; points: number };
  }[];
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
}

export function useGamification() {
  return useQuery<GamificationState>({
    queryKey: ["gamification"],
    queryFn: async () => {
      const { data } = await api.get("/api/gamification/me");
      return data;
    },
  });
}

export function useRecordActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/gamification/activity");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
    },
  });
}

export function useLeaderboard(type: "global" | "weekly" | "friends" = "global") {
  return useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["leaderboard", type],
    queryFn: async () => {
      const { data } = await api.get(`/api/gamification/leaderboard?type=${type}`);
      return data;
    },
  });
}
