import type { RenderProgress } from "../../lib/export/canvasRenderer";

interface ExportProgressProps {
  progress: RenderProgress;
}

export function ExportProgress({ progress }: ExportProgressProps) {
  const labels: Record<RenderProgress["status"], string> = {
    loading: "Loading video...",
    rendering: "Rendering overlay...",
    encoding: "Encoding...",
    done: "Ready to share",
    error: "Export failed",
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs text-white/70">
        <span>{labels[progress.status]}</span>
        <span>{Math.round(progress.progress)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
}
