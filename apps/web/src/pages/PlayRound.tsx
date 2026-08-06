import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Loading } from "../components/common/Loading";
import { Feed } from "../components/feed/Feed";
import { usePlayStore } from "../stores/playStore";
import { trackFirstRoundComplete, trackDailyDropPlayed, trackEvent } from "../lib/analytics";
import { useUIStore } from "../stores/uiStore";
import type { FeedReview } from "../hooks/useFeed";

const attributedResultCards = new Set<string>();

interface ReviewDetailData {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productTag: string | null;
  rating: number;
  duration: number;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  product?: { id: string; name: string; category: string; affiliateUrl: string | null } | null;
  viewerGuess: { guessedRating: number } | null;
  counts: { likes: number; comments: number; guesses: number };
}

interface PerVideoChallenge {
  id: string;
  type: string;
  reviewId: string;
  challengerId: string;
  challengedId: string | null;
  challengerScore: number;
  challengedScore: number;
  challenger: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  challenged: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  canSeeResult: boolean;
  isParticipant: boolean;
  status: string;
}

function mapToFeedReview(data: ReviewDetailData): FeedReview {
  return {
    id: data.id,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl,
    caption: data.caption,
    productTag: data.productTag,
    rating: data.rating,
    duration: data.duration,
    createdAt: data.createdAt,
    user: data.user,
    product: data.product ?? { id: "", name: data.productTag ?? "Review", category: "", affiliateUrl: null },
    likeCount: data.counts.likes,
    guessCount: data.counts.guesses,
    commentCount: data.counts.comments,
    shareCount: 0,
  };
}

export function PlayRound() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get("challenge");

  const [review, setReview] = useState<FeedReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealData, setRevealData] = useState<
    Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>
  >(new Map());
  const [selectedRatings, setSelectedRatings] = useState<Map<string, number>>(new Map());
  const [challenge, setChallenge] = useState<PerVideoChallenge | null>(null);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  void isCreatingChallenge;
  void isRematching;
  const markPlayed = usePlayStore((s) => s.markPlayed);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [reviewRes, challengeRes] = await Promise.all([
          api.get<ReviewDetailData>(`/api/reviews/${id}`),
          challengeId ? api.get<{ challenge: PerVideoChallenge }>(`/api/challenges/per-video/${challengeId}`) : null,
        ]);
        if (cancelled) return;
        setReview(mapToFeedReview(reviewRes.data));
        if (challengeRes) {
          setChallenge(challengeRes.data.challenge);
        }
      } catch {
        setError("Could not load this round.");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, challengeId]);

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

      const channel = getAnalyticsChannel();
      if (channel === "result_card" && !attributedResultCards.has(reviewId)) {
        attributedResultCards.add(reviewId);
        trackEvent("card_to_install_attributed", { reviewId, channel });
      }

      if (challengeId) {
        trackEvent("challenge_accepted", { challengeId, reviewId, channel });
        // Refresh challenge state so scores/winner update.
        const challengeRes = await api.get<{ challenge: PerVideoChallenge }>(`/api/challenges/per-video/${challengeId}`);
        setChallenge(challengeRes.data.challenge);
      }
    } catch {
      // ignore
    } finally {
      setRevealed((prev) => new Set(prev).add(reviewId));
    }
  }

  function handlePlayAgain() {
    navigate("/play");
  }

  async function handleChallengeFriend() {
    if (!review) return;
    setIsCreatingChallenge(true);
    try {
      const { data } = await api.post<{ challenge: PerVideoChallenge }>("/api/challenges/per-video", {
        reviewId: review.id,
      });
      const challenge = data.challenge;
      const message = `I scored ${challenge.challengerScore}/10 guessing this review — bet you can't beat me`;
      const url = `${window.location.origin}/challenge/${challenge.id}`;
      trackEvent("challenge_sent", { challengeId: challenge.id, reviewId: review.id, channel: "challenge_link" });

      if (navigator.canShare?.({ title: "Silent Review", text: message, url })) {
        await navigator.share({ title: "Silent Review", text: message, url });
      } else {
        await navigator.clipboard.writeText(`${message}\n${url}`);
        addToast("Challenge link copied!", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create challenge";
      addToast(message, "error");
    } finally {
      setIsCreatingChallenge(false);
    }
  }

  async function handleRematch() {
    if (!challenge) return;
    setIsRematching(true);
    try {
      const { data } = await api.post<{ challenge: PerVideoChallenge }>(`/api/challenges/per-video/${challenge.id}/rematch`);
      trackEvent("rematch_started", {
        challengeId: data.challenge.id,
        previousChallengeId: challenge.id,
        reviewId: data.challenge.reviewId,
        channel: getAnalyticsChannel(),
      });
      navigate(`/play/${data.challenge.reviewId}?challenge=${data.challenge.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start rematch";
      addToast(message, "error");
    } finally {
      setIsRematching(false);
    }
  }

  const challengeComplete = challenge?.canSeeResult ?? false;

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
      onChallengeFriend={handleChallengeFriend}
      challengeComplete={challengeComplete}
      onRematch={challengeComplete ? handleRematch : undefined}
    />
  );
}

function getAnalyticsChannel(): "organic" | "challenge_link" | "result_card" | "creator_link" {
  const params = new URLSearchParams(window.location.search);
  const channel = params.get("channel") ?? params.get("utm_medium") ?? "organic";
  if (["challenge_link", "result_card", "creator_link"].includes(channel)) {
    return channel as "challenge_link" | "result_card" | "creator_link";
  }
  return "organic";
}
