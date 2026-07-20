import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { VideoCard } from "../components/VideoCard";

interface FeedReview {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productTag: string | null;
  rating: number;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  createdAt: string;
  counts: { likes: number; comments: number; guesses: number };
}

export function Home() {
  const [reviews, setReviews] = useState<FeedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get("/api/feed")
      .then((res) => setReviews(res.data.reviews))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="snap-y h-full overflow-y-scroll">
      {reviews.map((review) => (
        <VideoCard
          key={review.id}
          id={review.id}
          videoUrl={review.videoUrl}
          caption={review.caption}
          productTag={review.productTag}
          username={review.user.username}
          avatarUrl={review.user.avatarUrl}
          revealed={revealed.has(review.id)}
          rating={review.rating}
          onReveal={async (guess) => {
            try {
              await api.post(`/api/reviews/${review.id}/guess`, { guessedRating: guess });
            } catch {
              // ignore guess errors; still reveal
            }
            setRevealed((prev) => new Set(prev).add(review.id));
          }}
        />
      ))}
      {reviews.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg text-white/70">No reviews yet.</p>
          <a href="/record" className="text-brand-500 underline">
            Be the first to review
          </a>
        </div>
      )}
    </div>
  );
}
