import { useEffect } from "react";
import { queryClient } from "../lib/queryClient";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import type { FeedResponse } from "./useFeed";

const FEED_LIMIT = 10;

export function usePrefetchFeed() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    // Only prefetch once per session.
    if (queryClient.getQueryData(["feed", "for-you"])) return;

    queryClient
      .prefetchInfiniteQuery({
        queryKey: ["feed", "for-you"],
        queryFn: async ({ pageParam }) => {
          const params = new URLSearchParams();
          if (pageParam) params.set("cursor", String(pageParam));
          params.set("limit", String(FEED_LIMIT));
          const { data } = await api.get<FeedResponse>(`/api/feed?${params.toString()}`);
          return data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: FeedResponse) => lastPage.nextCursor,
        staleTime: 5 * 60 * 1000,
      })
      .catch(() => {});
  }, [user]);
}
