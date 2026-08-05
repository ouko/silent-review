import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DailyDropPlayer } from "../components/dailydrop/DailyDropPlayer";
import { Loading } from "../components/common/Loading";
import { ResultCardPreview } from "../components/share/ResultCardPreview";
import { useTodaysDailyDrop, useDailyDropAttempt } from "../hooks/useDailyDrop";
import { usePlayStore } from "../stores/playStore";
import { useGamification } from "../hooks/useGamification";
import { trackDailyDropPlayed, trackFirstRoundComplete } from "../lib/analytics";

function scoreToAccuracy(score: number): number {
  switch (score) {
    case 10:
      return 100;
    case 5:
      return 50;
    case 2:
      return 20;
    default:
      return 0;
  }
}

export function DailyDropRound() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useTodaysDailyDrop();
  const attemptMutation = useDailyDropAttempt();
  const markPlayed = usePlayStore((s) => s.markPlayed);
  const { data: gamification } = useGamification();
  const [attemptResult, setAttemptResult] = useState<ReturnType<typeof useDailyDropAttempt>["data"]>();
  const [showResultCard, setShowResultCard] = useState(false);

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
    setShowResultCard(true);
  }

  const userGuess = attemptResult?.guess.guessedRating ?? null;
  const score = attemptResult?.score ?? 0;
  const accuracy = scoreToAccuracy(score);
  const streak = gamification?.streakDays ?? 0;

  return (
    <>
      <DailyDropPlayer
        dailyDrop={dailyDrop}
        alreadyGuessed={alreadyGuessed}
        onAttempt={handleAttempt}
        onReveal={handleReveal}
        isSubmitting={attemptMutation.isPending}
        attemptResult={attemptResult ?? undefined}
      />
      {showResultCard && userGuess !== null && (
        <ResultCardPreview
          open={showResultCard}
          onClose={() => setShowResultCard(false)}
          reviewId={dailyDrop.review.id}
          title="Daily Drop"
          subtitle={new Date(dailyDrop.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          guesses={[userGuess]}
          actualRatings={[dailyDrop.review.rating]}
          accuracy={accuracy}
          streak={streak}
          dailyDropDate={dailyDrop.date.slice(0, 10)}
        />
      )}
    </>
  );
}
