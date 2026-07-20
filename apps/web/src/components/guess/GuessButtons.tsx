import { motion } from "framer-motion";

interface GuessButtonsProps {
  selected: number | null;
  onSelect: (rating: number) => void;
  disabled?: boolean;
}

function ratingColor(rating: number): string {
  if (rating <= 5) return "bg-red-500";
  if (rating === 6) return "bg-yellow-500";
  return "bg-green-500";
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(15);
  }
}

export function GuessButtons({ selected, onSelect, disabled }: GuessButtonsProps) {
  return (
    <div className="grid grid-cols-5 gap-2 px-4">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
        const isSelected = selected === rating;
        return (
          <motion.button
            key={rating}
            whileTap={disabled ? {} : { scale: 0.85 }}
            whileHover={disabled ? {} : { scale: 1.05 }}
            animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
            onClick={() => {
              if (disabled) return;
              triggerHaptic();
              onSelect(rating);
            }}
            disabled={disabled}
            aria-label={`Rate ${rating} out of 10`}
            className={`flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full text-lg font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white ${ratingColor(
              rating
            )} ${isSelected ? "ring-4 ring-white" : "opacity-80"} ${
              disabled ? "opacity-50" : ""
            }`}
          >
            {rating}
          </motion.button>
        );
      })}
    </div>
  );
}
