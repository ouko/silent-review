import { useMemo } from "react";
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

interface Particle {
  id: number;
  color: string;
  left: number;
  yEnd: number;
  xStart: number;
  xEnd: number;
}

function Confetti() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        color: ["#f43f5e", "#22c55e", "#eab308", "#3b82f6"][i % 4],
        left: Math.random() * 100,
        yEnd: 200 + Math.random() * 150,
        xStart: (Math.random() - 0.5) * 100,
        xEnd: (Math.random() - 0.5) * 250,
      })),
    []
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            backgroundColor: p.color,
            left: `${p.left}%`,
            top: -10,
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: [0, p.yEnd],
            x: [p.xStart, p.xEnd],
            rotate: [0, 720],
            opacity: [1, 0],
          }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
