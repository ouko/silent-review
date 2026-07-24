import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { BrandSpinner } from "../ui/BrandSpinner";
import { AlertCircle, RotateCcw } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  shouldPlay: boolean;
  preload?: boolean;
  poster?: string | null;
  onClick?: () => void;
}

export function VideoPlayer({ src, shouldPlay, preload, poster, onClick }: VideoPlayerProps) {
  const { videoRef, isBuffering, error, reload } = useVideoPlayer({ src, shouldPlay, preload });

  return (
    <div className="relative h-full w-full bg-black" onClick={onClick}>
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="h-full w-full object-cover"
        muted
        playsInline
        loop
      />

      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
          <BrandSpinner size="md" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Loading video</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center backdrop-blur-sm">
          {poster ? (
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          ) : null}
          <div className="relative z-10 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Video unavailable</p>
              <p className="mt-1 max-w-[200px] text-xs text-white/60">{error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reload();
              }}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-white/90"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
