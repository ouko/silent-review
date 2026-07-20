import { StatsChart } from "../stats/StatsChart";

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
  const isExact = userGuess === rating;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <p className="text-sm text-white/60">The actual rating was</p>
        <div className="text-7xl font-bold text-brand-500">{rating}</div>
      </div>

      {userGuess !== null && (
        <div>
          <p className="text-lg">
            You guessed <span className="font-bold">{userGuess}</span>
          </p>
          <p className={`text-3xl font-bold ${isExact ? "text-green-400" : "text-white"}`}>
            +{score} pts
          </p>
          {isExact && <p className="text-green-400">Exact guess!</p>}
        </div>
      )}

      <StatsChart distribution={distribution} totalGuesses={totalGuesses} />

      <button
        onClick={onPlayAgain}
        className="rounded-full bg-white px-6 py-3 font-bold text-black active:scale-95"
      >
        Play again
      </button>
    </div>
  );
}
