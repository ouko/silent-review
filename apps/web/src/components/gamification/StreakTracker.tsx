import { motion, AnimatePresence } from "framer-motion";
import { Flame, Shield, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { trackStreakMilestone } from "../../lib/analytics";

const MILESTONE_DAYS = [7, 30, 100, 365];

export interface MilestoneAward {
  slug: string;
  name: string;
  streakDays: number;
}

interface StreakTrackerProps {
  streakDays: number;
  longestStreak: number;
  freezeHeld: number;
  newlyUnlockedMilestone?: MilestoneAward | null;
}

export function StreakTracker({
  streakDays,
  longestStreak,
  freezeHeld,
  newlyUnlockedMilestone,
}: StreakTrackerProps) {
  const [showMilestone, setShowMilestone] = useState(false);
  const [celebrated, setCelebrated] = useState<Set<number>>(new Set());

  useEffect(() => {
    trackStreakMilestone(streakDays);
  }, [streakDays]);

  useEffect(() => {
    if (newlyUnlockedMilestone) {
      setShowMilestone(true);
      return;
    }

    for (const milestone of MILESTONE_DAYS) {
      if (streakDays >= milestone && !celebrated.has(milestone)) {
        setCelebrated((prev) => new Set(prev).add(milestone));
        setShowMilestone(true);
        return;
      }
    }
  }, [streakDays, newlyUnlockedMilestone, celebrated]);

  const milestoneName =
    newlyUnlockedMilestone?.name ??
    MILESTONE_DAYS.filter((m) => streakDays >= m && !celebrated.has(m)).pop();

  const displayMilestone =
    newlyUnlockedMilestone ??
    (typeof milestoneName === "number"
      ? {
          slug: `streak_${milestoneName}`,
          name: `${milestoneName}-Day Streak`,
          streakDays: milestoneName,
        }
      : null);

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
        {freezeHeld > 0 && (
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-300 ring-1 ring-blue-500/30">
            <Shield className="h-3.5 w-3.5" />
            Protected
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-white/50">Longest: {longestStreak} days</p>

      <AnimatePresence>
        {showMilestone && displayMilestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onClick={() => setShowMilestone(false)}
          >
            <div className="relative w-full max-w-xs rounded-3xl bg-gradient-to-br from-orange-500 to-rose-600 p-6 text-center text-white shadow-2xl">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMilestone(false);
                }}
                className="absolute right-3 top-3 rounded-full p-1 text-white/70 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"
              >
                <Trophy className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-black">{displayMilestone.name}</h3>
              <p className="mt-1 text-sm font-medium text-white/90">
                {displayMilestone.streakDays}-day streak milestone unlocked!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
