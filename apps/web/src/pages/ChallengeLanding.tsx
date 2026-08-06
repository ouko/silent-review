import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { BrandSpinner } from "../components/ui/BrandSpinner";
import { Swords } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { fetchMe } from "../lib/auth";

interface ChallengeLandingData {
  id: string;
  reviewId: string;
  challenger: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  challenged: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  description: string | null;
  challengerScore: number;
}

export function ChallengeLanding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<ChallengeLandingData | null>(null);

  // Hydrate auth on this public route so we know whether the user is logged in.
  useEffect(() => {
    if (!isAuthLoading) return;
    let cancelled = false;
    setAuthLoading(true);
    fetchMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, setUser, setAuthLoading, logout]);

  useEffect(() => {
    if (!id || isAuthLoading) return;
    const challengeId = id;
    let cancelled = false;

    async function load() {
      try {
        if (!user) {
          // Queue challenge for post-authentication redirect.
          sessionStorage.setItem("pendingChallengeId", challengeId);
          navigate(`/login?challenge=${challengeId}`);
          return;
        }

        const { data } = await api.get<{ challenge: ChallengeLandingData }>(`/api/challenges/per-video/${challengeId}`);
        if (cancelled) return;
        setChallenge(data.challenge);

        // If this challenge has no specific opponent, claim it.
        if (!data.challenge.challenged) {
          await api.post(`/api/challenges/per-video/${challengeId}/accept`);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("401")) {
          sessionStorage.setItem("pendingChallengeId", challengeId);
          navigate(`/login?challenge=${challengeId}`);
          return;
        }
        setError("This challenge isn't available right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, user, isAuthLoading]);

  function handlePlay() {
    if (!challenge) return;
    sessionStorage.removeItem("pendingChallengeId");
    navigate(`/play/${challenge.reviewId}?challenge=${challenge.id}`);
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <BrandSpinner size="lg" />
        <p className="text-sm text-white/50">Loading challenge...</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
        <p className="text-lg font-bold">{error || "Challenge not found"}</p>
        <Button onClick={() => navigate("/play")} className="mt-4">
          Back to Play
        </Button>
      </div>
    );
  }

  const challengerName = challenge.challenger.displayName ?? challenge.challenger.username;

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
        className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-violet-500 shadow-lg shadow-rose-500/20"
      >
        <Swords className="h-8 w-8 text-white" />
      </motion.div>

      <h1 className="mt-5 text-3xl font-black tracking-tighter gradient-text">Head-to-head</h1>
      <p className="mt-2 max-w-xs text-white/60">
        {challenge.challenger.avatarUrl && (
          <img
            src={challenge.challenger.avatarUrl}
            alt=""
            className="mx-auto mb-3 h-12 w-12 rounded-full object-cover"
          />
        )}
        <span className="font-bold text-white">{challengerName}</span> scored{" "}
        <span className="font-bold text-white">{challenge.challengerScore}/10</span>.
        <br />
        {challenge.description ?? "Can you beat them?"}
      </p>

      <Button onClick={handlePlay} className="mt-6 w-full max-w-sm">
        <Swords className="mr-2 h-4 w-4" />
        Take the challenge
      </Button>
    </div>
  );
}
