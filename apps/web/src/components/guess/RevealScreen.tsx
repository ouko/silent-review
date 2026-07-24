import { motion, useReducedMotion } from "framer-motion";
import { Trophy, RotateCcw } from "lucide-react";
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
  const reducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: reducedMotion ? {} : { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.1 },
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
      className="relative flex h-full flex-col items-center justify-center gap-5 p-2 text-center"
    >
      <motion.div variants={itemVariants} className="flex flex-col items-center">
        <p className="text-xs font-bold uppercase tracking-widest text-white/50">
          The actual rating was
        </p>
        <motion.div
          initial={reducedMotion ? { scale: 1 } : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 18 }}
          className="text-8xl font-black leading-none tracking-tighter gradient-text"
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

      <motion.div
        variants={itemVariants}
        className="glow-border flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-rose-400" />
          <p className="text-sm font-bold text-white/90">Result Card</p>
        </div>
        <p className="text-sm text-white/60">
          Share your guess with friends. Sharing coming soon!
        </p>
      </motion.div>

      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.96 }}
        onClick={onPlayAgain}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-bold text-black transition-transform"
      >
        <RotateCcw className="h-4 w-4" />
        Play again
        <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-sm">
          {rating}/10
        </span>
      </motion.button>
    </motion.div>
  );
}
