import { Link } from "react-router-dom";
import type { ProfileReview } from "../../hooks/useProfile";

interface ProfileReviewsProps {
  reviews: ProfileReview[];
}

export function ProfileReviews({ reviews }: ProfileReviewsProps) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {reviews.length === 0 && (
        <p className="py-12 text-center text-sm text-white/50">No reviews yet.</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {reviews.map((review) => (
          <Link
            key={review.id}
            to={`/review/${review.id}`}
            className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white/5"
          >
            {review.thumbnailUrl ? (
              <img
                src={review.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-brand-500">
                {review.rating}/10
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs font-semibold">
              ❤ {review.counts.likes} 💬 {review.counts.comments}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
