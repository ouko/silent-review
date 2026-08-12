import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const reducedMotion = useReducedMotion();

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
    <div className="rounded-2xl bg-gradient-to-br from-accent-yellow/15 to-accent-pink/15 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <motion.div
          animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-yellow/15 text-accent-yellow"
        >
          <Flame className="h-7 w-7" />
        </motion.div>
        <div>
          <p className="font-heading text-2xl font-bold tracking-tight">{streakDays}</p>
          <p className="text-xs font-medium text-white/50">day streak</p>
        </div>
        {freezeHeld > 0 && (
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-primary-500/15 px-2.5 py-1 text-xs font-bold text-primary-300 ring-1 ring-primary-500/30">
            <Shield className="h-3.5 w-3.5" />
            Protected
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-white/40">Longest: {longestStreak} days</p>

      <AnimatePresence>
        {showMilestone && displayMilestone && (
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowMilestone(false)}
          >
            <motion.div
              initial={reducedMotion ? {} : { y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-3xl bg-gradient-to-br from-accent-yellow to-accent-pink p-6 text-center text-white shadow-2xl"
            >
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/30" />
              <button
                onClick={() => setShowMilestone(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <motion.div
                initial={reducedMotion ? {} : { rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20"
              >
                <Trophy className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="font-heading text-2xl font-black tracking-tight">{displayMilestone.name}</h3>
              <p className="mt-1 text-sm font-medium text-white/90">
                {displayMilestone.streakDays}-day streak milestone unlocked!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
