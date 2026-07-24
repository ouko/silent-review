interface StatsChartProps {
  distribution: number[];
  totalGuesses: number;
}

export function StatsChart({ distribution, totalGuesses }: StatsChartProps) {
  const max = Math.max(1, ...distribution);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
        {totalGuesses.toLocaleString()} guesses
      </p>
      <div className="flex h-28 items-end justify-between gap-1">
        {distribution.map((count, index) => {
          const height = totalGuesses > 0 ? (count / max) * 100 : 0;
          const rating = index + 1;
          const isHigh = rating >= 7;
          const isMid = rating === 6;
          const gradient = isHigh
            ? "from-emerald-500 to-emerald-400"
            : isMid
              ? "from-amber-500 to-amber-400"
              : "from-rose-500 to-rose-400";
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t bg-gradient-to-t ${gradient} ${count === max ? "shadow-[0_0_10px_rgba(244,63,94,0.3)]" : ""}`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[10px] font-bold text-white/60">{rating}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
