import { useState } from "react";
import { Button } from "../ui/Button";

interface ReviewFinalizeProps {
  previewUrl: string;
  onSubmit: (input: { rating: number; caption: string }) => void;
  onBack: () => void;
  isUploading: boolean;
  progress: number;
}

const EMOJIS = ["😡", "😠", "😒", "😐", "🙂", "😊", "😃", "😄", "😍", "🤩"];

export function ReviewFinalize({
  previewUrl,
  onSubmit,
  onBack,
  isUploading,
  progress,
}: ReviewFinalizeProps) {
  const [rating, setRating] = useState(5);
  const [caption, setCaption] = useState("");

  return (
    <div className="flex h-full flex-col gap-4">
      <video
        src={previewUrl}
        autoPlay
        muted
        loop
        playsInline
        className="max-h-64 w-full rounded-2xl object-cover"
      />

      <div>
        <label className="text-sm text-white/70">Your rating</label>
        <div className="text-center text-3xl">{EMOJIS[rating - 1]}</div>
        <input
          type="range"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-center font-bold">{rating}/10</p>
      </div>

      <input
        placeholder="Caption (optional)"
        value={caption}
        maxLength={280}
        onChange={(e) => setCaption(e.target.value)}
        className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
      />
      <p className="text-right text-xs text-white/40">{caption.length}/280</p>

      {isUploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-white/60">{progress}%</p>
        </div>
      )}

      <div className="mt-auto flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={isUploading} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => onSubmit({ rating, caption })}
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? "Posting..." : "Post review"}
        </Button>
      </div>
    </div>
  );
}
