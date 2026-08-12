import { useChallenges } from "../../hooks/useChallenges";
import { Check, X, Trophy, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { trackEvent } from "../../lib/analytics";
import { useState } from "react";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";

export function ChallengeInbox() {
  const { discoverChallenges, isLoading, joinChallenge } = useChallenges();
  const addToast = useUIStore((s) => s.addToast);
  const [actingId, setActingId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const pending = discoverChallenges.slice(0, 3);

  async function handleAccept(challengeId: string) {
    setActingId(challengeId);
    try {
      await joinChallenge(challengeId);
      trackEvent("challenge_accepted", { challengeId, from: "play_home" });
      addToast("Challenge accepted!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not join challenge";
      addToast(message, "error");
    } finally {
      setActingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 flex items-center gap-3">
          <Skeleton circle className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-lime/15 text-accent-lime">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">No pending challenges</p>
            <p className="text-xs text-white/50">Send one to a friend!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-white/40">Pending challenges</h3>
        {discoverChallenges.length > 3 && (
          <span className="text-xs font-bold text-white/50">+{discoverChallenges.length - 3} more</span>
        )}
      </div>
      <div className="space-y-2">
        {pending.map((challenge, index) => {
          const isPerVideo = challenge.type === "PER_VIDEO";
          const challengeUrl = isPerVideo ? `/challenge/${challenge.id}` : undefined;
          const creatorName = challenge.creator?.displayName ?? challenge.creator?.username ?? "a friend";

          const content = (
            <>
              <Avatar
                src={challenge.creator?.avatarUrl}
                name={creatorName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{challenge.name}</p>
                <p className="truncate text-xs text-white/50">from {creatorName}</p>
              </div>
            </>
          );

          return (
            <motion.div
              key={challenge.id}
              initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl"
            >
              {challengeUrl ? (
                <Link
                  to={challengeUrl}
                  className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  {content}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
              )}
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={reducedMotion ? undefined : { scale: 0.88 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccept(challenge.id);
                  }}
                  disabled={actingId === challenge.id}
                  className="tap-48 flex h-10 w-10 items-center justify-center rounded-full bg-accent-lime/15 text-accent-lime transition-colors hover:bg-accent-lime/25 disabled:opacity-50"
                  aria-label="Accept challenge"
                >
                  {actingId === challenge.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </motion.button>
                <motion.button
                  whileTap={reducedMotion ? undefined : { scale: 0.88 }}
                  className="tap-48 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50 transition-colors hover:bg-white/10"
                  aria-label="Decline challenge"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
