import { useRef, useState, useCallback } from "react";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { VideoPlayer } from "./VideoPlayer";
import { RevealScreen } from "../guess/RevealScreen";
import type { FeedReview } from "../../hooks/useFeed";

interface FeedProps {
  reviews: FeedReview[];
  onReveal: (reviewId: string, guess?: number) => void;
  revealed: Set<string>;
  revealData: Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onRefresh?: () => void;
  onPlayAgain?: (reviewId: string) => void;
}

export function Feed({
  reviews,
  onReveal,
  revealed,
  revealData,
  onLoadMore,
  isLoadingMore,
  onRefresh,
  onPlayAgain,
}: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const { setItemRef, shouldPlay, shouldPreload, shouldRender } =
    useVideoFeed(reviews.length);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (pullStartY == null) return;
      const delta = e.touches[0].clientY - pullStartY;
      if (delta > 0) setPullDistance(Math.min(delta * 0.5, 80));
    },
    [pullStartY]
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60 && onRefresh) {
      onRefresh();
    }
    setPullStartY(null);
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore]);

  return (
    <div
      ref={containerRef}
      className="relative h-full snap-y snap-mandatory overflow-y-scroll"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="absolute left-0 right-0 top-0 z-10 flex items-end justify-center pb-4 text-sm font-medium text-white/70"
          style={{ height: pullDistance }}
        >
          {pullDistance > 60 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      {reviews.map((review, index) =>
        shouldRender(index) ? (
          <div
            key={review.id}
            ref={setItemRef(index)}
            data-index={index}
            className="relative h-full w-full snap-start"
          >
            <VideoPlayer
              src={review.videoUrl}
              shouldPlay={shouldPlay(index)}
              preload={shouldPreload(index)}
              poster={review.thumbnailUrl}
            />

            {/* Overlay: user info + guess UI */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold">
                  {review.user.username[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">@{review.user.username}</p>
                  <p className="text-sm text-white/80">{review.caption}</p>
                </div>
              </div>

              {!revealed.has(review.id) ? (
                <GuessOverlay onGuess={(guess) => onReveal(review.id, guess)} />
              ) : (
                <div className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/60 p-3">
                  {(() => {
                    const data = revealData.get(review.id);
                    if (!data) {
                      return (
                        <div className="text-center">
                          <p className="text-sm text-white/70">Actual rating</p>
                          <p className="text-4xl font-bold text-brand-500">
                            {review.rating}/10
                          </p>
                        </div>
                      );
                    }
                    return (
                      <RevealScreen
                        rating={data.rating}
                        userGuess={data.score === 10 ? data.rating : null}
                        score={data.score}
                        totalGuesses={data.totalGuesses}
                        distribution={data.distribution}
                        onPlayAgain={() => onPlayAgain?.(review.id)}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : null
      )}

      {isLoadingMore && (
        <div className="flex h-20 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
    </div>
  );
}

function GuessOverlay({ onGuess }: { onGuess: (guess: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="mt-4 space-y-3">
      <p className="text-center text-sm font-medium">Guess the rating</p>
      <div className="grid grid-cols-5 gap-2 px-4">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
          let color = "bg-red-500";
          if (rating === 6) color = "bg-yellow-500";
          if (rating >= 7) color = "bg-green-500";
          return (
            <button
              key={rating}
              onClick={() => setSelected(rating)}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg transition-transform active:scale-90 ${color} ${
                selected === rating ? "ring-4 ring-white scale-110" : "opacity-80"
              }`}
            >
              {rating}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => selected && onGuess(selected)}
        disabled={!selected}
        className="w-full rounded-xl bg-white py-3 font-bold text-black disabled:opacity-40"
      >
        Reveal
      </button>
    </div>
  );
}
