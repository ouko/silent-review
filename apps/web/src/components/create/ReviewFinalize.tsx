import { useState } from "react";
import { motion } from "framer-motion";
import { RatingBar } from "../guess/RatingBar";
import { Sparkles, Send, RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";

interface ReviewFinalizeProps {
  previewUrl: string;
  onSubmit: (input: { rating: number; caption: string; tag?: string; allowComments: boolean }) => void;
  onBack: () => void;
  isUploading: boolean;
  progress: number;
  error?: string | null;
}

const TAG_SUGGESTIONS = [
  "honest",
  "quick",
  "detailed",
  "funny",
  "unboxing",
  "first-impressions",
  "comparison",
  "love-it",
  "not-worth-it",
  "unexpected",
];

export function ReviewFinalize({
  previewUrl,
  onSubmit,
  onBack,
  isUploading,
  progress,
  error,
}: ReviewFinalizeProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const [allowComments, setAllowComments] = useState(true);

  const canSubmit = rating !== null && !isUploading;

  return (
    <div className="flex h-full flex-col gap-4 pb-4">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10">
        <video src={previewUrl} autoPlay muted loop playsInline className="max-h-56 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-void/60 via-transparent to-transparent" />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-400" />
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-white/50">Your rating</p>
        </div>
        <RatingBar selected={rating} onSelect={setRating} disabled={isUploading} />
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.05em] text-white/40">
          {rating === null ? "Tap a number to rate" : `${rating}/10`}
        </p>
      </div>

      <div className="space-y-1">
        <input
          placeholder="Caption (optional)"
          aria-label="Caption (optional)"
          value={caption}
          maxLength={280}
          onChange={(e) => setCaption(e.target.value)}
          className="input-modern"
        />
        <p className="text-right text-xs text-white/40">{caption.length}/280</p>
      </div>

      <div className="relative">
        <input
          placeholder="Tag (optional)"
          aria-label="Tag (optional)"
          value={tag}
          maxLength={30}
          onChange={(e) => setTag(e.target.value)}
          className="input-modern"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TAG_SUGGESTIONS.filter((t) => t.toLowerCase().includes(tag.toLowerCase()) && t !== tag.toLowerCase())
            .slice(0, 6)
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                #{t}
              </button>
            ))}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.05em] text-white/60">
            <span>Uploading</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-pink"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-sm font-semibold text-white">Allow comments</span>
        <div className="relative">
          <input
            type="checkbox"
            checked={allowComments}
            onChange={(e) => setAllowComments(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-7 w-12 rounded-full bg-white/10 transition-colors peer-checked:bg-primary-500" />
          <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
        </div>
      </label>

      <div className="mt-auto flex gap-3">
        <Button variant="ghost" shape="rounded" className="flex-1" onClick={onBack} disabled={isUploading}>
          <RotateCcw className="h-4 w-4" />
          Back
        </Button>
        <Button
          variant="primary"
          shape="rounded"
          className="flex-1"
          onClick={() => rating !== null && onSubmit({ rating, caption, tag: tag.trim() || undefined, allowComments })}
          disabled={!canSubmit}
          loading={isUploading}
        >
          <Send className="h-4 w-4" />
          Post
        </Button>
      </div>
    </div>
  );
}
