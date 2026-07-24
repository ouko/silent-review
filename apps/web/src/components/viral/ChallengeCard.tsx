import { motion } from "framer-motion";
import { useChallenges } from "../../hooks/useChallenges";
import { Trophy, Calendar, Plus, User, TrendingUp } from "lucide-react";

export function ChallengeList() {
  const { challenges, isLoading, createChallenge, joinChallenge, isCreating } = useChallenges();

  async function handleCreate() {
    const name = prompt("Challenge name:");
    if (!name) return;
    await createChallenge({ name });
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-white/50">Loading challenges...</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Active challenges</h2>
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

      {challenges.length === 0 && (
        <p className="mt-4 text-center text-sm text-white/50">
          No active challenges. Create one to challenge friends!
        </p>
      )}

      <div className="mt-4 space-y-3">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
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

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => joinChallenge(challenge.id)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10"
            >
              <TrendingUp className="h-4 w-4" />
              Join challenge
            </motion.button>
          </div>
        ))}
      </div>
    </section>
  );
}
