import { useState } from "react";

interface VideoCardProps {
  id: string;
  videoUrl: string;
  caption?: string | null;
  productTag?: string | null;
  username: string;
  avatarUrl?: string | null;
  onReveal?: (guess: number) => void | Promise<void>;
  revealed?: boolean;
  rating?: number;
}

export function VideoCard(props: VideoCardProps) {
  const [guess, setGuess] = useState<number | null>(null);

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

        {!props.revealed && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Guess the rating (1–10)</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setGuess(n)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                    guess === n
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-white/40 text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => guess && props.onReveal?.(guess)}
              disabled={!guess}
              className="mt-3 w-full rounded-xl bg-white py-3 font-bold text-black disabled:opacity-40"
            >
              Reveal
            </button>
          </div>
        )}

        {props.revealed && typeof props.rating === "number" && (
          <div className="mt-4 rounded-xl bg-white/10 p-3 text-center">
            <p className="text-sm text-white/70">Actual rating</p>
            <p className="text-4xl font-bold text-brand-500">{props.rating}/10</p>
          </div>
        )}
      </div>
    </div>
  );
}
