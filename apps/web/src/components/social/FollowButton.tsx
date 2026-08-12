import { motion, useReducedMotion } from "framer-motion";
import { useFollow } from "../../hooks/useFollow";
import { Loader2, UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  userId?: string;
  isFollowing?: boolean;
  size?: "sm" | "md";
}

export function FollowButton({ userId, isFollowing = false, size = "md" }: FollowButtonProps) {
  const follow = useFollow(userId);
  const reducedMotion = useReducedMotion();

  const sizeClasses = size === "sm" ? "min-h-9 px-4 py-1.5 text-xs" : "min-h-12 px-6 py-2.5 text-sm";

  return (
    <motion.button
      whileTap={reducedMotion || follow.isPending ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={() => follow.mutate(isFollowing)}
      disabled={!userId || follow.isPending}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? "Unfollow user" : "Follow user"}
      className={[
        "inline-flex w-full items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:opacity-50",
        sizeClasses,
        isFollowing
          ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
          : "bg-gradient-to-r from-primary-500 to-accent-pink text-white shadow-glow hover:shadow-glow-lg",
      ].join(" ")}
    >
      {follow.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {follow.isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </motion.button>
  );
}
