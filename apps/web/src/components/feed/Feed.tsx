import { useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { VideoPlayer } from "./VideoPlayer";
import { VideoInfo } from "./VideoInfo";
import { RatingBar } from "../guess/RatingBar";
import { RevealScreen } from "../guess/RevealScreen";
import { BrandSpinner } from "../ui/BrandSpinner";
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
  const reducedMotion = useReducedMotion();
  const { setItemRef, shouldPlay, shouldPreload, shouldRender } = useVideoFeed(reviews.length);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (pullStartY == null) return;
      const delta = e.touches[0].clientY - pullStartY;
      if (delta > 0) setPullDistance(Math.min(delta * 0.5, 90));
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
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute left-0 right-0 top-0 z-10 flex flex-col items-center justify-end pb-3"
          style={{ height: pullDistance }}
        >
          <BrandSpinner size="sm" />
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/60">
            {pullDistance > 60 ? "Release to refresh" : "Pull to refresh"}
          </p>
        </motion.div>
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

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pb-20">
              <VideoInfo
                username={review.user.username}
                avatarUrl={review.user.avatarUrl}
                caption={review.caption}
                productTag={review.productTag}
              />

              {!revealed.has(review.id) ? (
                <FeedGuessOverlay onGuess={(guess) => onReveal(review.id, guess)} />
              ) : (
                <div className="mt-4 max-h-[60vh] overflow-auto rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl">
                  {(() => {
                    const data = revealData.get(review.id);
                    if (!data) {
                      return (
                        <div className="text-center">
                          <p className="text-sm text-white/60">Actual rating</p>
                          <p className="text-6xl font-black tracking-tighter text-brand-500">
                            {review.rating}
                            <span className="text-2xl text-white/40">/10</span>
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
        <div className="flex h-24 items-center justify-center gap-3">
          <BrandSpinner size="md" />
          <p className="text-sm font-medium text-white/50">Loading more...</p>
        </div>
      )}
    </div>
  );
}

function FeedGuessOverlay({ onGuess }: { onGuess: (guess: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-5 space-y-4"
    >
      <p className="text-center text-xs font-bold uppercase tracking-widest text-white/50">
        Guess the rating
      </p>
      <RatingBar selected={selected} onSelect={setSelected} />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => selected && onGuess(selected)}
        disabled={!selected}
        className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reveal
      </motion.button>
    </motion.div>
  );
}
