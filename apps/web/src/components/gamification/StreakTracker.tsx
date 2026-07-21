import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakTrackerProps {
  streakDays: number;
  longestStreak: number;
}

export function StreakTracker({ streakDays, longestStreak }: StreakTrackerProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 p-4">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Flame className="h-8 w-8 text-orange-500" />
        </motion.div>
        <div>
          <p className="text-2xl font-bold">{streakDays}</p>
          <p className="text-xs text-white/60">day streak</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-white/50">Longest: {longestStreak} days</p>
    </div>
  );
}
