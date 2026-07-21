import { Star } from "lucide-react";

interface PointsDisplayProps {
  points: number;
}

export function PointsDisplay({ points }: PointsDisplayProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-brand-500/20 px-3 py-1 text-sm font-bold text-brand-400">
      <Star className="h-4 w-4" />
      {points.toLocaleString()}
    </div>
  );
}
