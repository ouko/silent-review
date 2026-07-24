import { useState } from "react";
import { useFeed, type FeedType } from "../hooks/useFeed";
import { Feed } from "../components/feed/Feed";
import { FeedTabs } from "../components/feed/FeedTabs";
import { BrandSpinner } from "../components/ui/BrandSpinner";
import { api } from "../lib/api";

const TABS: { id: FeedType; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "following", label: "Following" },
  { id: "trending", label: "Trending" },
];

export function Home() {
  const [activeTab, setActiveTab] = useState<FeedType>("for-you");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } =
    useFeed(activeTab);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealData, setRevealData] = useState<
    Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>
  >(new Map());

  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];

  async function handleReveal(reviewId: string, guess?: number) {
    try {
      if (guess !== undefined) {
        const guessRes = await api.post(`/api/guesses/${reviewId}`, { guessedRating: guess });
        const revealRes = await api.get(`/api/guesses/${reviewId}/reveal`);
        setRevealData((prev) =>
          new Map(prev).set(reviewId, {
            rating: revealRes.data.rating,
            score: guessRes.data.guess.score,
            totalGuesses: revealRes.data.totalGuesses,
            distribution: revealRes.data.distribution,
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setRevealed((prev) => new Set(prev).add(reviewId));
    }
  }

  function handlePlayAgain(reviewId: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.delete(reviewId);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <FeedTabs
        tabs={TABS}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as FeedType)}
      />

      {status === "pending" ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <BrandSpinner size="lg" />
          <p className="text-sm font-medium text-white/50">Loading reviews...</p>
        </div>
      ) : (
        <Feed
          reviews={reviews}
          onReveal={handleReveal}
          revealed={revealed}
          revealData={revealData}
          onLoadMore={() => hasNextPage && fetchNextPage()}
          isLoadingMore={isFetchingNextPage}
          onRefresh={() => refetch()}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
