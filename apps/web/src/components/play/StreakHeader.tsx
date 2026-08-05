import { Star } from "lucide-react";
import { useGamification } from "../../hooks/useGamification";
import { StreakTracker } from "../gamification/StreakTracker";

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

  const { streakDays, longestStreak, freezeHeld, totalPoints } = data;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <StreakTracker
        streakDays={streakDays}
        longestStreak={longestStreak}
        freezeHeld={freezeHeld}
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 px-3 py-1.5 text-sm font-bold text-rose-300 ring-1 ring-rose-500/30">
          <Star className="h-4 w-4 text-rose-400" />
          {totalPoints.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
