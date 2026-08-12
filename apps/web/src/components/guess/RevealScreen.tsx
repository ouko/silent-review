import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Trophy, RotateCcw, Swords } from "lucide-react";
import { StatsChart } from "../stats/StatsChart";
import { GuessFeedback } from "./GuessFeedback";
import { ResultCardPreview } from "../share/ResultCardPreview";
import { useGamification } from "../../hooks/useGamification";
import { Button } from "../ui/Button";

interface RevealScreenProps {
  rating: number;
  userGuess: number | null;
  score: number;
  totalGuesses: number;
  distribution: number[];
  onPlayAgain: () => void;
  reviewId?: string;
  videoUrl?: string;
  productName?: string | null;
  onShare?: () => void;
  onChallengeFriend?: () => void;
  challengeComplete?: boolean;
  onRematch?: () => void;
}

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

export function RevealScreen({
  rating,
  userGuess,
  score,
  totalGuesses,
  distribution,
  onPlayAgain,
  reviewId,
  productName,
  onChallengeFriend,
  challengeComplete,
  onRematch,
}: RevealScreenProps) {
  const reducedMotion = useReducedMotion();
  const [showResultCard, setShowResultCard] = useState(false);
  const { data: gamification } = useGamification();

  const containerVariants = {
    hidden: reducedMotion ? {} : { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.08 },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? {} : { opacity: 0, y: 20 },
    show: reducedMotion ? {} : { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex h-full flex-col items-center justify-center gap-4 p-2 text-center"
    >
      <motion.div variants={itemVariants} className="flex flex-col items-center">
        <p className="text-xs font-bold uppercase tracking-[0.05em] text-white/50">The actual rating was</p>
        <motion.div
          initial={reducedMotion ? { scale: 1 } : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 18 }}
          className="font-heading text-8xl font-black leading-none tracking-tighter gradient-text"
          aria-label={`Actual rating ${rating} out of 10`}
        >
          {rating}
          <span className="text-3xl text-white/30">/10</span>
        </motion.div>
      </motion.div>

      {userGuess !== null && (
        <motion.div variants={itemVariants}>
          <GuessFeedback userGuess={userGuess} actualRating={rating} score={score} />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="w-full">
        <StatsChart distribution={distribution} totalGuesses={totalGuesses} />
      </motion.div>

      <motion.div variants={itemVariants} className="flex w-full max-w-sm flex-col gap-2">
        <Button variant="primary" shape="rounded" className="w-full" onClick={() => setShowResultCard(true)}>
          <Trophy className="h-4 w-4" />
          Share result card
        </Button>

        {challengeComplete && onRematch && (
          <Button variant="secondary" shape="rounded" className="w-full" onClick={onRematch}>
            <Swords className="h-4 w-4" />
            Rematch
          </Button>
        )}

        {!challengeComplete && onChallengeFriend && (
          <Button variant="lime" shape="rounded" className="w-full" onClick={onChallengeFriend}>
            <Swords className="h-4 w-4" />
            Challenge a friend
          </Button>
        )}

        <Button variant="ghost" shape="rounded" className="w-full" onClick={onPlayAgain}>
          <RotateCcw className="h-4 w-4" />
          Play again
        </Button>
      </motion.div>

      {showResultCard && reviewId && userGuess !== null && (
        <ResultCardPreview
          open={showResultCard}
          onClose={() => setShowResultCard(false)}
          reviewId={reviewId}
          title={productName || "Silent Review"}
          subtitle="Can you beat my guess?"
          guesses={[userGuess]}
          actualRatings={[rating]}
          accuracy={scoreToAccuracy(score)}
          streak={gamification?.streakDays ?? 0}
          onChallengeInstead={onChallengeFriend}
        />
      )}
    </motion.div>
  );
}
