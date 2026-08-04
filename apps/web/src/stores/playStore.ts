import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface PlayState {
  dailyDropReviewId: string | null;
  playedReviewIds: string[];
  pendingChallengeCount: number;
  markPlayed: (reviewId: string) => void;
  setDailyDrop: (reviewId: string | null) => void;
  setPendingChallengeCount: (count: number) => void;
  isPlayed: (reviewId: string) => boolean;
}

function buildStorageKey(userId: string | null | undefined) {
  return userId ? `sr-play-store-${userId}` : "sr-play-store-anon";
}

export const usePlayStore = create<PlayState>()(
  persist(
    (set, get) => ({
      dailyDropReviewId: null,
      playedReviewIds: [],
      pendingChallengeCount: 0,
      markPlayed: (reviewId) =>
        set((state) => ({
          playedReviewIds: state.playedReviewIds.includes(reviewId)
            ? state.playedReviewIds
            : [...state.playedReviewIds, reviewId],
        })),
      setDailyDrop: (reviewId) => set({ dailyDropReviewId: reviewId }),
      setPendingChallengeCount: (count) => set({ pendingChallengeCount: count }),
      isPlayed: (reviewId) => get().playedReviewIds.includes(reviewId),
    }),
    {
      name: "sr-play-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        playedReviewIds: state.playedReviewIds,
        dailyDropReviewId: state.dailyDropReviewId,
      }),
    }
  )
);

export function setPlayStoreUser(userId: string | null | undefined) {
  // Zustand persist uses a static key; to scope per user we rely on
  // the consumer reading `user?.id` and passing it to helpers where needed.
  // This function is a placeholder hook location for future user scoping.
}
