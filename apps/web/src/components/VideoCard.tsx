import { useState } from "react";
import { useGuess } from "../hooks/useGuess";
import { GuessButtons } from "./guess/GuessButtons";
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
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
        <div className="flex items-center gap-3">
          {props.avatarUrl ? (
            <img src={props.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold">
              {props.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">@{props.username}</p>
            <p className="text-sm text-white/80">{props.caption}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-center text-sm font-medium">Guess the rating</p>
          <GuessButtons
            selected={selectedRating}
            onSelect={setSelectedRating}
            disabled={isSubmitting}
          />
          <button
            onClick={handleReveal}
            disabled={selectedRating == null || isSubmitting}
            className="w-full rounded-xl bg-white py-3 font-bold text-black disabled:opacity-40"
          >
            {isSubmitting ? "Checking..." : "Reveal"}
          </button>
        </div>
      </div>
    </div>
  );
}
