import { Heart } from "lucide-react";
import { useLikeStatus, useToggleLike } from "../../hooks/useLike";

interface LikeButtonProps {
  reviewId: string;
  showCount?: boolean;
  size?: "sm" | "md";
}

export function LikeButton({ reviewId, showCount = true, size = "md" }: LikeButtonProps) {
  const { data, isLoading } = useLikeStatus(reviewId);
  const toggle = useToggleLike(reviewId);

  const liked = data?.liked ?? false;
  const count = data?.count ?? 0;

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate();
      }}
      disabled={toggle.isPending || isLoading}
      aria-pressed={liked}
      aria-label={liked ? `Unlike review. ${count} likes` : `Like review. ${count} likes`}
      className={`flex items-center gap-1.5 font-bold transition-transform disabled:opacity-50 ${
        liked ? "text-rose-400" : "text-white/80 hover:text-white"
      } ${size === "sm" ? "text-xs" : "text-sm"}`}
    >
      <Heart className={`${iconSize} ${liked ? "fill-rose-400" : ""} transition-transform active:scale-90`} aria-hidden="true" />
      {showCount && <span aria-hidden="true">{count}</span>}
    </button>
  );
}
