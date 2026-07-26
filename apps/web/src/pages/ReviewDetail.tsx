import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Share2 } from "lucide-react";
import { api } from "../lib/api";
import { Loading } from "../components/common/Loading";
import { LikeButton } from "../components/social/LikeButton";
import { CommentsSection } from "../components/comments/CommentsSection";

interface ReviewDetailData {
  id: string;
  videoUrl: string;
  caption: string | null;
  productTag: string | null;
  rating: number;
  duration: number;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  viewerGuess: { guessedRating: number } | null;
  counts: { likes: number; comments: number; guesses: number };
}

export function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReview = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/reviews/${id}`);
      setReview(res.data);
    } catch {
      setError("Could not load this review. It may have been removed or the link is invalid.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, [id]);

  if (!id) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
        <p className="text-lg font-bold">Review not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-rose-400">Go back</button>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  if (error || !review) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
        <p className="text-lg font-bold">{error || "Review not found"}</p>
        <div className="mt-4 flex gap-3">
          <button onClick={loadReview} className="text-rose-400">Retry</button>
          <button onClick={() => navigate(-1)} className="text-white/70">Go back</button>
        </div>
      </div>
    );
  }

  const displayName = review.user.displayName || review.user.username;

  async function handleShare() {
    if (!review) return;
    const url = `${window.location.origin}/review/${review.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Silent Review", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center gap-3 border-b border-white/10 bg-black/80 p-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold">Review</h1>
      </header>

      <div className="relative aspect-[9/16] w-full bg-black sm:aspect-video sm:max-h-[60vh]">
        <video
          src={review.videoUrl}
          className="h-full w-full object-contain"
          loop
          muted
          playsInline
          autoPlay
          controls
        />
      </div>

      <div className="border-b border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white/70">
            {review.user.avatarUrl ? (
              <img src={review.user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{displayName}</p>
            {review.productTag && (
              <span className="text-xs font-medium text-rose-400">#{review.productTag}</span>
            )}
          </div>
        </div>

        {review.caption && <p className="mb-3 text-sm text-white/90">{review.caption}</p>}

        <div className="flex items-center gap-5 text-sm font-bold text-white/80">
          <LikeButton reviewId={review.id} />
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-5 w-5" />
            <span>{review.counts.comments}</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 transition-colors hover:text-white"
            aria-label="Share review"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1">
        <CommentsSection reviewId={id} />
      </div>
    </div>
  );
}
