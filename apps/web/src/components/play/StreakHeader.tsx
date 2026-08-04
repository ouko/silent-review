import { Flame, Shield, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useGamification } from "../../hooks/useGamification";

export function StreakHeader() {
  const { data, isLoading } = useGamification();

  if (isLoading || !data) {
    return (
      <div className="flex h-20 items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl animate-pulse">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  const { streakDays, totalPoints } = data;

  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/30 to-red-500/30">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Flame className="h-6 w-6 text-orange-400" />
          </motion.div>
        </div>
        <div>
          <p className="text-2xl font-black leading-none text-white">{streakDays}</p>
          <p className="text-xs font-bold text-white/50">day streak</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {streakDays > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20">
            <Shield className="h-3.5 w-3.5" />
            Streak active
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 px-3 py-1.5 text-sm font-bold text-rose-300 ring-1 ring-rose-500/30">
          <Star className="h-4 w-4 text-rose-400" />
          {totalPoints.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
