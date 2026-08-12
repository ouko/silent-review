import { Star, Zap } from "lucide-react";
import { useGamification } from "../../hooks/useGamification";
import { StreakTracker } from "../gamification/StreakTracker";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";

export function StreakHeader() {
  const { data, isLoading } = useGamification();

  if (isLoading || !data) {
    return (
      <div className="flex h-24 items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <Skeleton circle className="h-14 w-14" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
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
        <Badge variant="yellow">
          <Star className="h-3.5 w-3.5" />
          {totalPoints.toLocaleString()} pts
        </Badge>
        {freezeHeld > 0 && (
          <Badge variant="primary">
            <Zap className="h-3.5 w-3.5" />
            Freeze ready
          </Badge>
        )}
      </div>
    </div>
  );
}
