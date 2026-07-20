import { motion } from "framer-motion";
import { StatsChart } from "../stats/StatsChart";
import { GuessFeedback } from "./GuessFeedback";

interface RevealScreenProps {
  rating: number;
  userGuess: number | null;
  score: number;
  totalGuesses: number;
  distribution: number[];
  onPlayAgain: () => void;
}

export function RevealScreen({
  rating,
  userGuess,
  score,
  totalGuesses,
  distribution,
  onPlayAgain,
}: RevealScreenProps) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 18 }}
      >
        <p className="text-sm text-white/60">The actual rating was</p>
        <div className="text-7xl font-bold text-brand-500" aria-label={`Actual rating ${rating} out of 10`}>
          {rating}
        </div>
      </motion.div>

      {userGuess !== null && (
        <GuessFeedback userGuess={userGuess} actualRating={rating} score={score} />
      )}

      <StatsChart distribution={distribution} totalGuesses={totalGuesses} />

      {/* Comments placeholder */}
      <div className="w-full max-w-sm rounded-xl bg-white/5 p-3 text-left">
        <p className="text-sm font-semibold text-white/80">Comments</p>
        <p className="mt-1 text-sm text-white/50">No comments yet. Be the first to react!</p>
      </div>

      {/* Share buttons placeholder */}
      <div className="flex w-full max-w-sm gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-white/10 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Share
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl bg-white/10 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Copy link
        </button>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onPlayAgain}
        className="rounded-full bg-white px-6 py-3 font-bold text-black"
      >
        Play again
        <span className="ml-2 inline-block rounded-full bg-black/10 px-2 py-0.5 text-sm">
          {rating}/10
        </span>
      </motion.button>
    </div>
  );
}
