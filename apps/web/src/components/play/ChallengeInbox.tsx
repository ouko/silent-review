import { useChallenges } from "../../hooks/useChallenges";
import { User, Check, X, Trophy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { trackEvent } from "../../lib/analytics";
import { useState } from "react";

export function ChallengeInbox() {
  const { discoverChallenges, isLoading, joinChallenge } = useChallenges();
  const addToast = useUIStore((s) => s.addToast);
  const [actingId, setActingId] = useState<string | null>(null);

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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">No pending challenges</p>
          <p className="text-xs text-white/50">Send one to a friend!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/40">Pending challenges</h3>
        {discoverChallenges.length > 3 && (
          <span className="text-xs font-bold text-white/50">+{discoverChallenges.length - 3} more</span>
        )}
      </div>
      {pending.map((challenge) => {
        const isPerVideo = challenge.type === "PER_VIDEO";
        const challengeUrl = isPerVideo ? `/challenge/${challenge.id}` : undefined;
        const content = (
          <>
            {challenge.creator?.avatarUrl ? (
              <img src={challenge.creator.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <User className="h-5 w-5 text-white/50" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{challenge.name}</p>
              <p className="truncate text-xs text-white/50">from {challenge.creator?.displayName ?? challenge.creator?.username ?? "a friend"}</p>
            </div>
          </>
        );

        return (
          <div
            key={challenge.id}
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
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept(challenge.id);
                }}
                disabled={actingId === challenge.id}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                aria-label="Accept challenge"
              >
                {actingId === challenge.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20"
                aria-label="Decline challenge"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
