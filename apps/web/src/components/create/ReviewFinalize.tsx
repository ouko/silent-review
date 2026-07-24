import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { RatingBar } from "../guess/RatingBar";
import { Sparkles, Send, RotateCcw } from "lucide-react";

interface ReviewFinalizeProps {
  previewUrl: string;
  onSubmit: (input: { rating: number; caption: string; tag?: string }) => void;
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
  const [rating, setRating] = useState(5);
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tagInputRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
        <video
          src={previewUrl}
          autoPlay
          muted
          loop
          playsInline
          className="max-h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-400" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Your rating</p>
        </div>
        <RatingBar selected={rating} onSelect={setRating} disabled={isUploading} />
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-white/40">
          {rating}/10
        </p>
      </div>

      <div className="space-y-1">
        <input
          placeholder="Caption (optional)"
          value={caption}
          maxLength={280}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition-colors focus:border-white/20 focus:bg-white/10"
        />
        <p className="text-right text-xs text-white/40">{caption.length}/280</p>
      </div>

      <div className="relative">
        <input
          ref={tagInputRef}
          placeholder="Tag (optional)"
          value={tag}
          maxLength={30}
          onChange={(e) => setTag(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition-colors focus:border-white/20 focus:bg-white/10"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TAG_SUGGESTIONS.filter((t) => t.toLowerCase().includes(tag.toLowerCase()) && t !== tag.toLowerCase())
            .slice(0, 6)
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                #{t}
              </button>
            ))}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/60">
            <span>Uploading</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <div className="mt-auto flex gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          disabled={isUploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Back
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSubmit({ rating, caption, tag: tag.trim() || undefined })}
          disabled={isUploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isUploading ? "Posting..." : "Post review"}
        </motion.button>
      </div>
    </div>
  );
}
