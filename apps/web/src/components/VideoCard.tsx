import { useState } from "react";
import { motion } from "framer-motion";
import { useGuess } from "../hooks/useGuess";
import { VideoInfo } from "./feed/VideoInfo";
import { RatingBar } from "./guess/RatingBar";
import { RevealScreen } from "./guess/RevealScreen";

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
      <div className="relative h-full w-full snap-start overflow-hidden bg-black">
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
    <div className="relative h-full w-full snap-start overflow-hidden bg-black">
      <video
        src={props.videoUrl}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pb-10">
        <VideoInfo
          username={props.username}
          avatarUrl={props.avatarUrl}
          caption={props.caption}
          productTag={props.productTag}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mt-5 space-y-4"
        >
          <p className="text-center text-xs font-bold uppercase tracking-widest text-white/50">
            Guess the rating
          </p>
          <RatingBar
            selected={selectedRating}
            onSelect={setSelectedRating}
            disabled={isSubmitting}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleReveal}
            disabled={selectedRating == null || isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Checking..." : "Reveal"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
