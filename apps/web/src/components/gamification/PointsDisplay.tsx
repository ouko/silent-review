import { Star } from "lucide-react";

interface PointsDisplayProps {
  points: number;
}

export function PointsDisplay({ points }: PointsDisplayProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 px-3 py-1 text-sm font-bold text-rose-300 ring-1 ring-rose-500/30">
      <Star className="h-4 w-4 text-rose-400" />
      {points.toLocaleString()}
    </div>
  );
}
