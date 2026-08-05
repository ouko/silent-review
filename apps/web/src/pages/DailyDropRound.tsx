import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DailyDropPlayer } from "../components/dailydrop/DailyDropPlayer";
import { Loading } from "../components/common/Loading";
import { useTodaysDailyDrop, useDailyDropAttempt } from "../hooks/useDailyDrop";
import { usePlayStore } from "../stores/playStore";
import { trackDailyDropPlayed, trackFirstRoundComplete } from "../lib/analytics";

export function DailyDropRound() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useTodaysDailyDrop();
  const attemptMutation = useDailyDropAttempt();
  const markPlayed = usePlayStore((s) => s.markPlayed);
  const [attemptResult, setAttemptResult] = useState<ReturnType<typeof useDailyDropAttempt>["data"]>();

  if (isLoading) return <Loading />;

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
        <p className="text-lg font-bold">{error ? "Could not load today's Daily Drop." : "No Daily Drop today."}</p>
        <button onClick={() => navigate("/play")} className="mt-4 text-rose-400">Back to Play</button>
      </div>
    );
  }

  const { dailyDrop, alreadyGuessed } = data;

  async function handleAttempt(rating: number) {
    try {
      const result = await attemptMutation.mutateAsync({
        dailyDropId: dailyDrop.id,
        guessedRating: rating,
      });
      setAttemptResult(result);
      markPlayed(dailyDrop.review.id);
      trackFirstRoundComplete({ reviewId: dailyDrop.review.id });
      trackDailyDropPlayed({ reviewId: dailyDrop.review.id });
    } catch {
      // The player shows the reveal screen regardless so the UI doesn't feel stuck.
      // A 409 duplicate-attempt response is surfaced by the mutation's error state.
    }
  }

  function handleReveal() {
    navigate("/play");
  }

  return (
    <DailyDropPlayer
      dailyDrop={dailyDrop}
      alreadyGuessed={alreadyGuessed}
      onAttempt={handleAttempt}
      onReveal={handleReveal}
      isSubmitting={attemptMutation.isPending}
      attemptResult={attemptResult ?? undefined}
    />
  );
}
