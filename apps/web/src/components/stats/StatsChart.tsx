interface StatsChartProps {
  distribution: number[];
  totalGuesses: number;
}

export function StatsChart({ distribution, totalGuesses }: StatsChartProps) {
  const max = Math.max(1, ...distribution);

  return (
    <div className="w-full max-w-sm">
      <p className="mb-2 text-sm text-white/60">{totalGuesses} guesses</p>
      <div className="flex h-32 items-end justify-between gap-1">
        {distribution.map((count, index) => {
          const height = totalGuesses > 0 ? (count / max) * 100 : 0;
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-500/80"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-white/60">{index + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
