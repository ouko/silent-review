import { useVideoPlayer } from "../../hooks/useVideoPlayer";

interface VideoPlayerProps {
  src: string;
  shouldPlay: boolean;
  preload?: boolean;
  poster?: string | null;
  onClick?: () => void;
}

export function VideoPlayer({ src, shouldPlay, preload, poster, onClick }: VideoPlayerProps) {
  const { videoRef, isBuffering, error } = useVideoPlayer({ src, shouldPlay, preload });

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
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center text-sm text-white/80">
          {error}
        </div>
      )}
    </div>
  );
}
