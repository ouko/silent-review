import { useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Eye, MessageCircle, Share2 } from "lucide-react";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { LikeButton } from "../social/LikeButton";
import { VideoPlayer } from "./VideoPlayer";
import { VideoInfo } from "./VideoInfo";
import { RatingBar } from "../guess/RatingBar";
import { RevealScreen } from "../guess/RevealScreen";
import { ShareSheet } from "../share/ShareSheet";
import { BrandSpinner } from "../ui/BrandSpinner";
import type { FeedReview } from "../../hooks/useFeed";

interface FeedProps {
  reviews: FeedReview[];
  selectedRatings: Map<string, number>;
  onSelectRating: (reviewId: string, rating: number) => void;
  onReveal: (reviewId: string) => void;
  revealed: Set<string>;
  revealData: Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onRefresh?: () => void;
  onPlayAgain?: (reviewId: string) => void;
  onScrollDirection?: (direction: "up" | "down") => void;
}

export function Feed({
  reviews,
  selectedRatings,
  onSelectRating,
  onReveal,
  revealed,
  revealData,
  onLoadMore,
  isLoadingMore,
  onRefresh,
  onPlayAgain,
  onScrollDirection,
}: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [shareReview, setShareReview] = useState<FeedReview | null>(null);
  const reducedMotion = useReducedMotion();
  const { setItemRef, shouldPlay, shouldPreload } = useVideoFeed(reviews.length);

  const touchStartY = useRef<number | null>(null);
  const touchLastY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    touchStartY.current = y;
    touchLastY.current = y;
    if (containerRef.current?.scrollTop === 0) {
      setPullStartY(y);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const y = e.touches[0].clientY;
      touchLastY.current = y;
      if (pullStartY == null) return;
      const delta = y - pullStartY;
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

    // iOS Safari/Chrome throttle scroll events during momentum scrolling, so use
    // the touch gesture itself as a reliable fallback for scroll direction.
    if (onScrollDirection && touchStartY.current != null && touchLastY.current != null) {
      const delta = touchStartY.current - touchLastY.current;
      const threshold = 30;
      if (Math.abs(delta) > threshold) {
        // Finger moving up means content scrolls down; finger moving down means content scrolls up.
        onScrollDirection(delta > 0 ? "down" : "up");
      }
    }
    touchStartY.current = null;
    touchLastY.current = null;
  }, [pullDistance, onRefresh, onScrollDirection]);

  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    if (onScrollDirection) {
      // Reaching the very top must always reveal the nav, even when iOS
      // throttles scroll events during momentum and the touch fallback
      // reported the fling direction instead.
      if (scrollTop <= 0) {
        onScrollDirection("up");
        lastScrollY.current = 0;
      } else {
        const diff = scrollTop - lastScrollY.current;
        if (Math.abs(diff) > 10) {
          onScrollDirection(diff > 0 ? "down" : "up");
          lastScrollY.current = scrollTop;
        }
      }
    }

    if (onLoadMore && !isLoadingMore && scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, onScrollDirection]);

  return (
    <div
      ref={containerRef}
      className="relative h-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
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

      {reviews.map((review, index) => (
          <div
            key={review.id}
            ref={setItemRef(index)}
            data-index={index}
            data-review-id={review.id}
            data-user-id={review.user.id}
            data-username={review.user.username}
            data-display-name={review.user.displayName || review.user.username}
            data-created-at={review.createdAt}
            data-product-tag={review.productTag}
            className="relative h-full w-full snap-start"
          >
            {shouldPreload(index) ? (
              <VideoPlayer
                src={review.videoUrl}
                shouldPlay={shouldPlay(index)}
                preload={shouldPreload(index)}
                poster={review.thumbnailUrl}
              />
            ) : (
              <div className="h-full w-full bg-black" aria-hidden="true" />
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pb-20">
              <VideoInfo
                username={review.user.username}
                userId={review.user.id}
                avatarUrl={review.user.avatarUrl}
                caption={review.caption}
                productTag={review.productTag}
              />

              <div className="mb-3 mt-3 flex items-center gap-5">
                <LikeButton reviewId={review.id} />
                <Link
                  to={`/review/${review.id}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Comment on review"
                  className="flex items-center gap-1.5 text-sm font-bold text-white/80 transition-colors hover:text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{review.commentCount}</span>
                </Link>
                <FeedActionButton
                  icon={<Share2 className="h-5 w-5" />}
                  count={review.shareCount}
                  onClick={() => setShareReview(review)}
                  aria-label="Share review"
                />
              </div>

              {!revealed.has(review.id) ? (
                <FeedGuessOverlay
                  selected={selectedRatings.get(review.id) ?? null}
                  onSelect={(rating) => onSelectRating(review.id, rating)}
                  onReveal={() => onReveal(review.id)}
                />
              ) : (
                <div className="mt-4 max-h-[60vh] overflow-auto rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl">
                  {(() => {
                    const data = revealData.get(review.id);
                    if (!data) {
                      return (
                        <div className="text-center">
                          <p className="text-sm text-white/60">Actual rating</p>
                          <p className="text-6xl font-black tracking-tighter gradient-text">
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
                        reviewId={review.id}
                        videoUrl={review.videoUrl}
                        productName={review.productTag ?? review.caption}
                        onShare={() => setShareReview(review)}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
      ))}

      {isLoadingMore && (
        <div className="flex h-24 items-center justify-center gap-3">
          <BrandSpinner size="md" />
          <p className="text-sm font-medium text-white/50">Loading more...</p>
        </div>
      )}

      {shareReview && (
        <ShareSheet
          reviewId={shareReview.id}
          videoUrl={shareReview.videoUrl}
          productName={shareReview.product?.name || shareReview.productTag || shareReview.caption || "Review"}
          rating={shareReview.rating}
          deepLinkUrl={`${window.location.origin}/review/${shareReview.id}`}
          onClose={() => setShareReview(null)}
        />
      )}
    </div>
  );
}

function FeedActionButton({
  icon,
  count,
  onClick,
  "aria-label": ariaLabel,
}: {
  icon: React.ReactNode;
  count: number;
  onClick: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center gap-1.5 text-sm font-bold text-white/80 transition-colors hover:text-white"
    >
      {icon}
      <span>{count}</span>
    </button>
  );
}

function FeedGuessOverlay({
  selected,
  onSelect,
  onReveal,
}: {
  selected: number | null;
  onSelect: (rating: number) => void;
  onReveal: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-5 space-y-4"
    >
      <div className="flex items-center justify-center gap-2">
        <Eye className="h-3.5 w-3.5 text-rose-400" />
        <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-white/60">
          Guess the rating
        </p>
      </div>
      <RatingBar selected={selected} onSelect={onSelect} />
      <motion.button
        whileTap={selected ? { scale: 0.97 } : {}}
        onClick={() => selected && onReveal()}
        disabled={!selected}
        className={[
          "w-full rounded-2xl py-3.5 font-bold text-white shadow-lg transition-all",
          selected
            ? "bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 shadow-rose-500/25 hover:shadow-rose-500/40 hover:brightness-110"
            : "cursor-not-allowed bg-white/10 text-white/40 shadow-none ring-1 ring-white/10",
        ].join(" ")}
      >
        {selected ? "Reveal rating" : "Pick a rating first"}
      </motion.button>
    </motion.div>
  );
}
