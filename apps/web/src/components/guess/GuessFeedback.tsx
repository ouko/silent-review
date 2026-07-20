import { motion } from "framer-motion";

interface GuessFeedbackProps {
  userGuess: number | null;
  actualRating: number;
  score: number;
}

export function GuessFeedback({ userGuess, actualRating, score }: GuessFeedbackProps) {
  const isExact = userGuess === actualRating;
  const message = isExact
    ? "Exact guess!"
    : score > 0
      ? "Nice guess!"
      : "Better luck next time!";

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className="flex flex-col items-center gap-1"
    >
      {isExact && <Confetti />}

      <motion.p
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className={`text-3xl font-bold ${isExact ? "text-green-400" : "text-white"}`}
        aria-live="polite"
      >
        +{score} pts
      </motion.p>

      <p className={`text-sm font-medium ${isExact ? "text-green-400" : "text-white/80"}`}>
        {message}
      </p>
    </motion.div>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            backgroundColor: ["#f43f5e", "#22c55e", "#eab308", "#3b82f6"][i % 4],
            left: `${Math.random() * 100}%`,
            top: -10,
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: [0, 200 + Math.random() * 150],
            x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 250],
            rotate: [0, 720],
            opacity: [1, 0],
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
