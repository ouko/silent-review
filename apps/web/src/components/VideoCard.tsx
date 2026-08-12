import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useGuess } from "../hooks/useGuess";
import { VideoInfo } from "./feed/VideoInfo";
import { RatingBar } from "./guess/RatingBar";
import { RevealScreen } from "./guess/RevealScreen";
import { Button } from "./ui/Button";

interface VideoCardProps {
  id: string;
  videoUrl: string;
  caption?: string | null;
  productTag?: string | null;
  username: string;
  avatarUrl?: string | null;
  revealed?: boolean;
  rating?: number;
}

export function VideoCard(props: VideoCardProps) {
  const [revealed, setRevealed] = useState(props.revealed ?? false);
  const [revealData, setRevealData] = useState<{
    rating: number;
    score: number;
    totalGuesses: number;
    distribution: number[];
  } | null>(null);
  const reducedMotion = useReducedMotion();

  const { selectedRating, setSelectedRating, submit, isSubmitting, reveal } = useGuess(props.id);

  async function handleReveal() {
    if (selectedRating == null) return;
    try {
      const result = await submit(selectedRating);
      const revealResult = await reveal();
      setRevealData({
        rating: revealResult.rating,
        score: result.guess.score,
        totalGuesses: revealResult.totalGuesses,
        distribution: revealResult.distribution,
      });
      setRevealed(true);
    } catch {
      // error surfaced by hook if needed
    }
  }

  function handlePlayAgain() {
    setRevealed(false);
    setSelectedRating(null);
    setRevealData(null);
  }

  if (revealed && revealData) {
    return (
      <div className="relative h-full w-full snap-start overflow-hidden bg-void">
        <RevealScreen
          rating={revealData.rating}
          userGuess={selectedRating}
          score={revealData.score}
          totalGuesses={revealData.totalGuesses}
          distribution={revealData.distribution}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full snap-start overflow-hidden bg-void">
      <video src={props.videoUrl} className="h-full w-full object-cover" loop muted playsInline autoPlay />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void via-void/60 to-transparent p-5 pb-10">
        <VideoInfo
          username={props.username}
          avatarUrl={props.avatarUrl}
          caption={props.caption}
          productTag={props.productTag}
        />

        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 space-y-4"
        >
          <p className="text-center text-xs font-bold uppercase tracking-[0.05em] text-white/50">
            What&apos;d they rate it?
          </p>
          <RatingBar selected={selectedRating} onSelect={setSelectedRating} disabled={isSubmitting} />
          <Button
            variant="primary"
            shape="pill"
            className="w-full"
            onClick={handleReveal}
            disabled={selectedRating == null || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? "Checking..." : "Lock it in"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
