import { Play, Check, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { DailyDropData } from "../../hooks/useDailyDrop";
import { Skeleton } from "../ui/Skeleton";
import { Badge } from "../ui/Badge";

interface DailyDropCardProps {
  dailyDrop?: DailyDropData | null;
  alreadyGuessed?: boolean;
  onPlay: () => void;
  isLoading: boolean;
}

export function DailyDropCard({ dailyDrop, alreadyGuessed, onPlay, isLoading }: DailyDropCardProps) {
  const reducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }

  if (!dailyDrop) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <Sparkles className="mb-3 h-10 w-10 text-white/30" />
        <p className="text-sm font-bold text-white/50">No Daily Drop today.</p>
        <p className="mt-1 text-xs text-white/40">Check back tomorrow.</p>
      </div>
    );
  }

  const review = dailyDrop.review;
  const isPlayed = alreadyGuessed ?? false;

  return (
    <motion.button
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onPlay}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-white/10 text-left shadow-glow"
    >
      {review.thumbnailUrl ? (
        <img
          src={review.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-pink/20">
          <Play className="h-12 w-12 text-white/40" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />

      <div className="absolute left-4 top-4">
        <Badge variant="lime">
          <Sparkles className="h-3.5 w-3.5" />
          Daily Drop
        </Badge>
      </div>

      {isPlayed && (
        <div className="absolute right-4 top-4">
          <Badge variant="primary">
            <Check className="h-3.5 w-3.5" />
            Played
          </Badge>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="line-clamp-2 font-heading text-xl font-bold leading-tight text-white">
          {review.productTag ?? review.caption ?? "Mystery review"}
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition-colors group-hover:bg-white/25">
            <Play className="h-4 w-4" />
            {isPlayed ? "Play again" : "Play today's guess"}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
