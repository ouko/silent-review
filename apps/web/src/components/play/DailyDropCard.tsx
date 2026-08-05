import { Play, Check, Eye } from "lucide-react";
import { motion } from "framer-motion";
import type { DailyDropData } from "../../hooks/useDailyDrop";

interface DailyDropCardProps {
  dailyDrop?: DailyDropData | null;
  alreadyGuessed?: boolean;
  onPlay: () => void;
  isLoading: boolean;
}

export function DailyDropCard({ dailyDrop, alreadyGuessed, onPlay, isLoading }: DailyDropCardProps) {
  if (isLoading) {
    return (
      <div className="aspect-[4/5] w-full animate-pulse rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="h-full w-full rounded-2xl bg-white/10" />
      </div>
    );
  }

  if (!dailyDrop) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <Eye className="mb-2 h-8 w-8 text-white/30" />
        <p className="text-sm font-bold text-white/50">No Daily Drop scheduled for today.</p>
      </div>
    );
  }

  const review = dailyDrop.review;
  const isPlayed = alreadyGuessed ?? false;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/10 text-left"
    >
      {review.thumbnailUrl ? (
        <img
          src={review.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/20 to-violet-500/20">
          <Play className="h-12 w-12 text-white/40" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md">
        Daily Drop
      </div>

      {isPlayed && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
          <Check className="h-3.5 w-3.5" />
          Played
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="line-clamp-2 text-lg font-bold leading-tight text-white">
          {review.productTag ?? review.caption ?? "Mystery review"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            <Play className="h-3.5 w-3.5" />
            {isPlayed ? "Play again" : "Play today's guess"}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
