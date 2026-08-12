import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { useLikeStatus, useToggleLike } from "../../hooks/useLike";

interface LikeButtonProps {
  reviewId: string;
  showCount?: boolean;
  size?: "sm" | "md";
}

export function LikeButton({ reviewId, showCount = true, size = "md" }: LikeButtonProps) {
  const { data, isLoading } = useLikeStatus(reviewId);
  const toggle = useToggleLike(reviewId);
  const [burst, setBurst] = useState(false);
  const reducedMotion = useReducedMotion();

  const liked = data?.liked ?? false;
  const count = data?.count ?? 0;
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!liked && !reducedMotion) {
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
    }
    toggle.mutate();
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={toggle.isPending || isLoading}
      aria-pressed={liked}
      aria-label={liked ? `Unlike review. ${count} likes` : `Like review. ${count} likes`}
      whileTap={reducedMotion ? undefined : { scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`tap-48 relative flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 font-bold backdrop-blur-md transition-colors disabled:opacity-50 ${
        liked ? "text-accent-pink" : "text-white/90 hover:bg-white/20"
      } ${size === "sm" ? "text-xs" : "text-sm"}`}
    >
      <span className="relative">
        <Heart className={`${iconSize} ${liked ? "fill-accent-pink" : ""} transition-colors`} aria-hidden="true" />
        <AnimatePresence>
          {burst && !reducedMotion && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1,
                    x: Math.cos((i * 60 * Math.PI) / 180) * 18,
                    y: Math.sin((i * 60 * Math.PI) / 180) * 18,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-pink"
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </span>
      {showCount && <span aria-hidden="true">{count}</span>}
    </motion.button>
  );
}
