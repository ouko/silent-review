import { motion, useReducedMotion } from "framer-motion";

interface RatingBarProps {
  selected: number | null;
  onSelect: (rating: number) => void;
  disabled?: boolean;
}

function segmentColor(rating: number): string {
  if (rating <= 4) return "from-rose-500 to-rose-400";
  if (rating <= 6) return "from-amber-500 to-amber-400";
  return "from-emerald-500 to-emerald-400";
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
}

export function RatingBar({ selected, onSelect, disabled }: RatingBarProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="Guess the rating"
      className="flex h-14 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1"
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
        const isSelected = selected === rating;
        const isFirst = rating === 1;
        const isLast = rating === 10;
        return (
          <motion.button
            key={rating}
            role="radio"
            aria-checked={isSelected}
            aria-label={`Rate ${rating} out of 10`}
            disabled={disabled}
            whileTap={disabled || reducedMotion ? {} : { scale: 0.95 }}
            onClick={() => {
              if (disabled) return;
              triggerHaptic();
              onSelect(rating);
            }}
            className={[
              "relative flex flex-1 items-center justify-center text-sm font-bold transition-all",
              isFirst ? "rounded-l-xl" : "",
              isLast ? "rounded-r-xl" : "",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              isSelected
                ? `bg-gradient-to-r ${segmentColor(rating)} text-white shadow-[0_0_16px_rgba(244,63,94,0.35)]`
                : "text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {rating}
          </motion.button>
        );
      })}
    </div>
  );
}
