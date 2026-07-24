import { Link } from "react-router-dom";
import { Heart, MessageCircle, Play } from "lucide-react";
import { motion } from "framer-motion";
import type { ProfileReview } from "../../hooks/useProfile";

interface ProfileReviewsProps {
  reviews: ProfileReview[];
}

function ratingGradient(rating: number): string {
  if (rating <= 4) return "from-rose-600 via-rose-500 to-orange-500";
  if (rating <= 6) return "from-amber-500 via-yellow-400 to-orange-400";
  if (rating <= 8) return "from-emerald-500 via-teal-400 to-cyan-400";
  return "from-violet-600 via-fuchsia-500 to-rose-500";
}

function ratingGlow(rating: number): string {
  if (rating <= 4) return "shadow-rose-500/30";
  if (rating <= 6) return "shadow-amber-400/30";
  if (rating <= 8) return "shadow-emerald-400/30";
  return "shadow-fuchsia-500/30";
}

export function ProfileReviews({ reviews }: ProfileReviewsProps) {
  return (
    <div className="h-full overflow-y-auto p-3">
      {reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Play className="h-7 w-7 text-white/30" />
          </div>
          <p className="text-sm font-bold text-white/70">No reviews yet</p>
          <p className="mt-1 max-w-xs text-xs text-white/40">Record your first silent review and share your rating with the world.</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
          >
            <Link
              to={`/review/${review.id}`}
              className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] ring-1 ring-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/10 active:scale-95"
            >
              {review.thumbnailUrl ? (
                <img
                  src={review.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div
                  className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${ratingGradient(review.rating)} opacity-90 transition-opacity duration-300 group-hover:opacity-100`}
                >
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shadow-lg ${ratingGlow(review.rating)} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}>
                    <Play className="h-5 w-5 fill-white text-white" />
                  </div>
                  <div className="flex items-baseline leading-none drop-shadow-md">
                    <span className="text-3xl font-black tracking-tighter text-white">{review.rating}</span>
                    <span className="ml-0.5 text-xs font-bold text-white/75">/10</span>
                  </div>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-2 pt-7 text-[10px] font-bold text-white/90">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                  {review.counts.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-white/80" />
                  {review.counts.comments}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
