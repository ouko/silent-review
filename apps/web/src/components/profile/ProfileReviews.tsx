import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import type { ProfileReview } from "../../hooks/useProfile";

interface ProfileReviewsProps {
  reviews: ProfileReview[];
}

export function ProfileReviews({ reviews }: ProfileReviewsProps) {
  return (
    <div className="h-full overflow-y-auto p-3">
      {reviews.length === 0 && (
        <p className="py-12 text-center text-sm text-white/50">No reviews yet.</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {reviews.map((review) => (
          <Link
            key={review.id}
            to={`/review/${review.id}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-transform active:scale-95"
          >
            {review.thumbnailUrl ? (
              <img
                src={review.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-2xl font-black tracking-tighter gradient-text">
                  {review.rating}
                  <span className="text-sm text-white/30">/10</span>
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-6 text-[10px] font-bold text-white/90">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-400" />
                {review.counts.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3 text-white/70" />
                {review.counts.comments}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
