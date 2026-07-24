import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLeaderboard, type LeaderboardEntry } from "../../hooks/useGamification";
import { FeedTabs } from "../feed/FeedTabs";
import { BrandSpinner } from "../ui/BrandSpinner";
import { Trophy, Medal, User } from "lucide-react";

const TABS = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "Weekly" },
  { id: "friends", label: "Friends" },
];

export function Leaderboard() {
  const [active, setActive] = useState("global");
  const { data, isLoading } = useLeaderboard(active as "global" | "weekly" | "friends");
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="p-4 pb-2">
        <h1 className="text-center text-2xl font-black tracking-tighter gradient-text">Leaderboard</h1>
        <p className="mt-1 text-center text-xs font-bold uppercase tracking-widest text-white/40">
          Top guessers this week
        </p>
      </div>

      <div className="px-3 pb-2">
        <FeedTabs tabs={TABS} activeId={active} onSelect={(id) => setActive(id)} />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <BrandSpinner size="md" />
            <p className="text-sm font-medium text-white/50">Loading rankings...</p>
          </div>
        )}

        {!isLoading && data?.leaderboard.length === 0 && (
          <p className="py-12 text-center text-sm text-white/50">No rankings yet.</p>
        )}

        <ul className="space-y-2">
          {data?.leaderboard.map((entry, index) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={index + 1}
              reducedMotion={reducedMotion}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  rank,
  reducedMotion,
}: {
  entry: LeaderboardEntry;
  rank: number;
  reducedMotion: boolean | null;
}) {
  const isTopThree = rank <= 3;

  return (
    <motion.li
      initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.03 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
    >
      <RankBadge rank={rank} />

      <div className="relative">
        {isTopThree && (
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-violet-500 opacity-50 blur-sm" />
        )}
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt=""
            className="relative h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 font-bold text-white ring-1 ring-white/10">
            <User className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-bold text-white">
          {entry.displayName ?? entry.username}
        </p>
        <p className="text-xs font-semibold text-white/50">@{entry.username}</p>
      </div>

      <div className="rounded-full bg-white/10 px-3 py-1 text-right">
        <p className="text-sm font-black tracking-tight gradient-text">{entry.totalPoints.toLocaleString()}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">pts</p>
      </div>
    </motion.li>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-lg shadow-amber-500/20">
        <Trophy className="h-4 w-4" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-black shadow-lg shadow-slate-400/20">
        <Medal className="h-4 w-4" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-orange-700/20">
        <Medal className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white/70">
      {rank}
    </div>
  );
}
