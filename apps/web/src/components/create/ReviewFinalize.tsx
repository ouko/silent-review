import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";

interface ReviewFinalizeProps {
  previewUrl: string;
  onSubmit: (input: { rating: number; caption: string; tag?: string }) => void;
  onBack: () => void;
  isUploading: boolean;
  progress: number;
  error?: string | null;
}

const EMOJIS = ["😡", "😠", "😒", "😐", "🙂", "😊", "😃", "😄", "😍", "🤩"];

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const filteredTags = TAG_SUGGESTIONS.filter(
    (t) => t.toLowerCase().includes(tag.toLowerCase()) && t !== tag.toLowerCase()
  );

  useEffect(() => {
    if (tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, []);

  function selectSuggestion(value: string) {
    setTag(value);
    setShowSuggestions(false);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <video
        src={previewUrl}
        autoPlay
        muted
        loop
        playsInline
        className="max-h-56 w-full rounded-2xl object-cover"
      />

      <div>
        <label className="text-sm text-white/70">Your rating</label>
        <div className="my-2 text-center text-4xl transition-transform duration-200 active:scale-110">
          {EMOJIS[rating - 1]}
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="rating-slider w-full"
          aria-label="Rating 1 to 10"
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

      <div className="relative">
        <input
          ref={tagInputRef}
          placeholder="Tag (optional)"
          value={tag}
          maxLength={30}
          onChange={(e) => {
            setTag(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        {showSuggestions && filteredTags.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-32 w-full overflow-auto rounded-xl bg-neutral-900 py-1 shadow-lg">
            {filteredTags.map((t) => (
              <button
                key={t}
                type="button"
                onMouseDown={() => selectSuggestion(t)}
                className="w-full px-4 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-center text-sm text-white/60">{progress}%</p>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <div className="mt-auto flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={isUploading} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => onSubmit({ rating, caption, tag: tag.trim() || undefined })}
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? "Posting..." : "Post review"}
        </Button>
      </div>
    </div>
  );
}
