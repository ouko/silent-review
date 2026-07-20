import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface FeedReview {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productTag: string | null;
  rating: number;
  duration: number;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  product: { id: string; name: string; category: string };
  counts?: { likes: number; comments: number; guesses: number };
}

interface FeedResponse {
  reviews: FeedReview[];
  nextCursor?: string;
}

export type FeedType = "for-you" | "following" | "trending";

export function useFeed(feedType: FeedType = "for-you", category?: string) {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ["feed", feedType, category],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", String(pageParam));
      params.set("limit", "10");

      let endpoint = "/api/feed";
      if (feedType === "following") endpoint = "/api/feed/following";
      else if (feedType === "trending") endpoint = "/api/feed/trending";

      const { data } = await api.get<FeedResponse>(`${endpoint}?${params.toString()}`);
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
