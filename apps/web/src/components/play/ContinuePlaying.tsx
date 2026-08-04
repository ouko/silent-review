import { Play, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { FeedReview } from "../../hooks/useFeed";

interface ContinuePlayingProps {
  reviews: FeedReview[];
  playedReviewIds: string[];
  onSelect: (review: FeedReview) => void;
}

export function ContinuePlaying({ reviews, playedReviewIds, onSelect }: ContinuePlayingProps) {
  if (reviews.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-xs font-black uppercase tracking-wider text-white/40">Continue playing</h3>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
        {reviews.map((review) => {
          const played = playedReviewIds.includes(review.id);
          return (
            <motion.button
              key={review.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect(review)}
              className="group relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 text-left"
            >
              {review.thumbnailUrl ? (
                <img src={review.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5">
                  <Play className="h-8 w-8 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {played && (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-500/80 p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="line-clamp-2 text-xs font-bold leading-tight text-white">
                  {review.productTag ?? review.caption ?? "Review"}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
