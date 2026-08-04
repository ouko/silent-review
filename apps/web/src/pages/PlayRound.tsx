import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Loading } from "../components/common/Loading";
import { Feed } from "../components/feed/Feed";
import { usePlayStore } from "../stores/playStore";
import { trackFirstRoundComplete, trackDailyDropPlayed } from "../lib/analytics";
import type { FeedReview } from "../hooks/useFeed";

export function PlayRound() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<FeedReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealData, setRevealData] = useState<
    Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>
  >(new Map());
  const [selectedRatings, setSelectedRatings] = useState<Map<string, number>>(new Map());
  const markPlayed = usePlayStore((s) => s.markPlayed);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/reviews/${id}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as FeedReview & { rating: number };
        setReview({
          ...data,
          likeCount: data.likeCount ?? 0,
          guessCount: data.guessCount ?? 0,
          commentCount: data.commentCount ?? 0,
          shareCount: data.shareCount ?? 0,
          product: data.product ?? { id: "", name: data.productTag ?? "Product", category: "" },
        });
      })
      .catch(() => setError("Could not load this round."))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  function selectRating(reviewId: string, rating: number) {
    setSelectedRatings((prev) => new Map(prev).set(reviewId, rating));
  }

  async function handleReveal(reviewId: string) {
    const guess = selectedRatings.get(reviewId);
    if (guess === undefined) return;
    try {
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
      trackFirstRoundComplete({ reviewId });
      trackDailyDropPlayed({ reviewId });
      markPlayed(reviewId);
    } catch {
      // ignore
    } finally {
      setRevealed((prev) => new Set(prev).add(reviewId));
    }
  }

  function handlePlayAgain() {
    navigate("/play");
  }

  if (loading) return <Loading />;
  if (error || !review) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
        <p className="text-lg font-bold">{error || "Round not found"}</p>
        <button onClick={() => navigate("/play")} className="mt-4 text-rose-400">Back to Play</button>
      </div>
    );
  }

  return (
    <Feed
      reviews={[review]}
      selectedRatings={selectedRatings}
      onSelectRating={selectRating}
      onReveal={handleReveal}
      revealed={revealed}
      revealData={revealData}
      onPlayAgain={handlePlayAgain}
    />
  );
}
