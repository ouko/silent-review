import { useFollow } from "../../hooks/useFollow";

interface FollowButtonProps {
  userId?: string;
  isFollowing?: boolean;
  size?: "sm" | "md";
}

export function FollowButton({ userId, isFollowing = false, size = "md" }: FollowButtonProps) {
  const follow = useFollow(userId);

  return (
    <button
      onClick={() => follow.mutate(isFollowing)}
      disabled={!userId || follow.isPending}
      className={`rounded-full font-semibold transition-colors disabled:opacity-50 ${
        isFollowing
          ? "border border-white/30 bg-transparent text-white hover:bg-white/10"
          : "bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90"
      } ${size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-2 text-sm"}`}
    >
      {follow.isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
