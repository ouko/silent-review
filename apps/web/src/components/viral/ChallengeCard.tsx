import { motion } from "framer-motion";
import { useChallenges, type Challenge } from "../../hooks/useChallenges";
import { Trophy, Calendar, Plus, User, TrendingUp, Share2, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useUIStore } from "../../stores/uiStore";

function ChallengeShareButton({ challenge }: { challenge: Challenge }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/viral?join=${challenge.id}`;

  async function handleShare() {
    const shareData = {
      title: `Join my "${challenge.name}" challenge on Silent Review`,
      text: challenge.description ?? "Guess ratings and compete with me!",
      url: link,
    };
    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition-colors hover:bg-white/20"
      aria-label="Share challenge"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}

function ChallengeCard({
  challenge,
  joined,
  onJoin,
  isJoining,
}: {
  challenge: Challenge;
  joined: boolean;
  onJoin: (id: string) => Promise<void>;
  isJoining: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/20 p-4"
      data-testid="challenge-card"
      data-challenge-id={challenge.id}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">{challenge.name}</h3>
          {challenge.description && (
            <p className="mt-0.5 text-sm text-white/60">{challenge.description}</p>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
          <Calendar className="h-3 w-3" />
          Ends {new Date(challenge.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="space-y-2">
        {challenge.participants.slice(0, 5).map((p, i) => {
          const max = Math.max(1, ...challenge.participants.map((x) => x.score));
          const pct = max > 0 ? (p.score / max) * 100 : 0;
          return (
            <div key={p.userId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-white/90">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                    {i + 1}
                  </span>
                  {p.user.avatarUrl ? (
                    <img src={p.user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-white/50" />
                  )}
                  {p.user.displayName ?? p.user.username}
                </span>
                <span className="font-black tracking-tight gradient-text">{p.score}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!joined && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onJoin(challenge.id)}
            disabled={isJoining}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isJoining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            {isJoining ? "Joining..." : "Join challenge"}
          </motion.button>
        )}
        {joined && (
          <span className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 py-3 text-sm font-bold text-emerald-300">
            <Check className="h-4 w-4" />
            Joined
          </span>
        )}
        <ChallengeShareButton challenge={challenge} />
      </div>
    </div>
  );
}

export function ChallengeList() {
  const {
    myChallenges,
    discoverChallenges,
    isLoading,
    createChallenge,
    joinChallenge,
    isCreating,
    isJoining,
  } = useChallenges();
  const addToast = useUIStore((s) => s.addToast);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function handleCreate() {
    const name = prompt("Challenge name:");
    if (!name) return;
    try {
      await createChallenge({ name });
      addToast("Challenge created!", "success");
    } catch {
      addToast("Could not create challenge. Try again.", "error");
    }
  }

  async function handleJoin(challengeId: string) {
    setJoiningId(challengeId);
    try {
      await joinChallenge(challengeId);
      addToast("You joined the challenge!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not join challenge";
      addToast(message, "error");
    } finally {
      setJoiningId(null);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-white/50">Loading challenges...</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Challenges</h2>
              <p className="text-xs text-white/50">Compete with friends on guesses</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New
          </motion.button>
        </div>

        {discoverChallenges.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Discover</h3>
            {discoverChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                joined={false}
                onJoin={handleJoin}
                isJoining={isJoining && joiningId === challenge.id}
              />
            ))}
          </div>
        )}

        {myChallenges.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Your challenges</h3>
            {myChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                joined={true}
                onJoin={handleJoin}
                isJoining={false}
              />
            ))}
          </div>
        )}

        {discoverChallenges.length === 0 && myChallenges.length === 0 && (
          <p className="mt-4 text-center text-sm text-white/50">
            No active challenges. Create one to challenge friends!
          </p>
        )}
      </div>
    </section>
  );
}
