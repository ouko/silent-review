import { useState, useMemo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Share2, Sparkles, Clock } from "lucide-react";
import { VideoPlayer } from "../feed/VideoPlayer";
import { RatingBar } from "../guess/RatingBar";
import type { DailyDropData, DailyDropAttemptResult } from "../../hooks/useDailyDrop";

interface DailyDropPlayerProps {
  dailyDrop: DailyDropData;
  alreadyGuessed: boolean;
  onAttempt: (rating: number) => void;
  onReveal: () => void;
  isSubmitting?: boolean;
  attemptResult?: DailyDropAttemptResult | null;
}

function computeScore(actual: number, guess: number): number {
  const diff = Math.abs(actual - guess);
  if (diff === 0) return 10;
  if (diff === 1) return 5;
  if (diff === 2) return 2;
  return 0;
}

function segmentColor(rating: number): string {
  if (rating <= 4) return "text-rose-400";
  if (rating <= 6) return "text-amber-400";
  return "text-emerald-400";
}

export function DailyDropPlayer({
  dailyDrop,
  alreadyGuessed,
  onAttempt,
  onReveal,
  isSubmitting,
  attemptResult,
}: DailyDropPlayerProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(alreadyGuessed);
  const reducedMotion = useReducedMotion();

  const review = dailyDrop.review;
  const actualRating = review.rating;
  const userGuess = attemptResult?.guess.guessedRating ?? selectedRating;
  const score = attemptResult?.score ?? (userGuess !== null ? computeScore(actualRating, userGuess) : 0);

  const isRevealed = hasSubmitted || alreadyGuessed;

  function handleSubmit() {
    if (selectedRating == null || isSubmitting) return;
    setHasSubmitted(true);
    onAttempt(selectedRating);
  }

  const countdownItems = useMemo(() => [3, 2, 1], []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <VideoPlayer
        src={review.videoUrl}
        shouldPlay={true}
        preload={true}
        poster={review.thumbnailUrl}
        reviewId={review.id}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-safe">
        <div className="rounded-full bg-black/50 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md">
          Daily Drop
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur-md">
          <Clock className="h-3.5 w-3.5" />
          {new Date(dailyDrop.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 pb-8">
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="guess"
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? {} : { opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center">
                <p className="text-sm font-bold text-white/70">
                  {review.productTag ?? review.product.name}
                </p>
                <p className="text-xs text-white/50">Guess the rating</p>
              </div>

              <RatingBar
                selected={selectedRating}
                onSelect={setSelectedRating}
                disabled={isSubmitting}
              />

              <motion.button
                whileTap={selectedRating && !isSubmitting ? { scale: 0.97 } : {}}
                onClick={handleSubmit}
                disabled={!selectedRating || isSubmitting}
                className={[
                  "w-full rounded-2xl py-3.5 font-bold text-white shadow-lg transition-all",
                  selectedRating && !isSubmitting
                    ? "bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 shadow-rose-500/25 hover:shadow-rose-500/40 hover:brightness-110"
                    : "cursor-not-allowed bg-white/10 text-white/40 shadow-none ring-1 ring-white/10",
                ].join(" ")}
              >
                {isSubmitting ? "Submitting..." : "Reveal rating"}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="reveal"
              initial={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 18 }}
              className="space-y-5 text-center"
            >
              {!attemptResult && isSubmitting && (
                <div className="flex items-center justify-center gap-2 text-white/70">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-sm font-bold">Revealing...</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                  The actual rating was
                </p>
                <motion.div
                  initial={reducedMotion ? { scale: 1 } : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 250, damping: 18, delay: 0.1 }}
                  className={`text-8xl font-black leading-none tracking-tighter ${segmentColor(actualRating)}`}
                >
                  {actualRating}
                  <span className="text-3xl text-white/30">/10</span>
                </motion.div>
              </div>

              {userGuess !== null && (
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Your guess</p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {userGuess}/10
                  </p>
                  <p className="mt-1 text-sm font-bold text-white/70">
                    +{score} points
                  </p>
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onReveal}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-bold text-black transition-transform"
              >
                <Share2 className="h-4 w-4" />
                Share result
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isRevealed && !reducedMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {countdownItems.map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -20, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-20, 100, 200],
                x: [0, (i - 1) * 40, (i - 1) * 80],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute left-1/2 top-1/3"
            >
              <Sparkles className="h-5 w-5 text-rose-400" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
