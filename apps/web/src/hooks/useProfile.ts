import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ProfileData {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  streakDays: number;
  createdAt: string;
  reviewCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface ProfileReview {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  rating: number;
  caption: string | null;
  createdAt: string;
  counts: { likes: number; comments: number; guesses: number };
}

export function useProfile(userId?: string) {
  return useQuery<ProfileData>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useProfileAchievements(userId?: string) {
  return useQuery<{
    achievements: {
      id: string;
      unlockedAt: string;
      achievement: { slug: string; name: string; description: string; iconUrl: string | null; points: number };
    }[];
  }>({
    queryKey: ["profile-achievements", userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${userId}/achievements`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useProfileReviews(userId?: string) {
  return useQuery<{ reviews: ProfileReview[]; nextCursor?: string }>({
    queryKey: ["profile-reviews", userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${userId}/reviews?limit=50`);
      return data;
    },
    enabled: !!userId,
  });
}
