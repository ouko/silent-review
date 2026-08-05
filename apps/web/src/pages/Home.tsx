import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useFeed, type FeedType } from "../hooks/useFeed";
import { Feed } from "../components/feed/Feed";
import { FeedTabs } from "../components/feed/FeedTabs";
import { BrandSpinner } from "../components/ui/BrandSpinner";
import { useUIStore } from "../stores/uiStore";
import { usePlayStore } from "../stores/playStore";
import { api } from "../lib/api";
import { trackEvent, trackFirstRoundComplete, trackDailyDropPlayed } from "../lib/analytics";

const TABS: { id: FeedType; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "following", label: "Following" },
  { id: "trending", label: "Trending" },
];

function isFeedType(value: string | null): value is FeedType {
  return value === "for-you" || value === "following" || value === "trending";
}

export function Home() {
  const markPlayed = usePlayStore((s) => s.markPlayed);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = isFeedType(tabParam) ? tabParam : "for-you";
  const [activeTab, setActiveTab] = useState<FeedType>(initialTab);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } =
    useFeed(activeTab);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealData, setRevealData] = useState<
    Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>
  >(new Map());
  const [selectedRatings, setSelectedRatings] = useState<Map<string, number>>(new Map());

  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];
  const setShowBottomNav = useUIStore((s) => s.setShowBottomNav);

  const handleScrollDirection = useCallback(
    (direction: "up" | "down") => {
      setShowBottomNav(direction === "up");
    },
    [setShowBottomNav]
  );

  function selectRating(reviewId: string, rating: number) {
    setSelectedRatings((prev) => new Map(prev).set(reviewId, rating));
  }

  async function handleReveal(reviewId: string) {
    const guess = selectedRatings.get(reviewId);
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
        trackEvent("guess_submitted", {
          reviewId,
          guessedRating: guess,
          actualRating: revealRes.data.rating,
          score: guessRes.data.guess.score,
        });
        markPlayed(reviewId);
        trackFirstRoundComplete({ reviewId });
        trackDailyDropPlayed({ reviewId });
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
    setSelectedRatings((prev) => {
      const next = new Map(prev);
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
          selectedRatings={selectedRatings}
          onSelectRating={selectRating}
          onReveal={handleReveal}
          revealed={revealed}
          revealData={revealData}
          onLoadMore={() => hasNextPage && fetchNextPage()}
          isLoadingMore={isFetchingNextPage}
          onRefresh={() => refetch()}
          onPlayAgain={handlePlayAgain}
          onScrollDirection={handleScrollDirection}
        />
      )}
    </div>
  );
}
