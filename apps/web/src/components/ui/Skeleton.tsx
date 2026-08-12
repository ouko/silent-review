interface SkeletonProps {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className = "", circle = false }: SkeletonProps) {
  return (
    <div
      className={[
        "shimmer",
        circle ? "rounded-full" : "rounded-2xl",
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 2, className = "" }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer h-4 rounded-lg" style={{ width: `${70 + (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}
