import { useState } from "react";
import { useLeaderboard, type LeaderboardEntry } from "../../hooks/useGamification";
import { Trophy } from "lucide-react";

const TABS = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "Weekly" },
  { id: "friends", label: "Friends" },
] as const;

export function Leaderboard() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("global");
  const { data, isLoading } = useLeaderboard(active);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-3 text-sm font-semibold ${
              active === tab.id ? "border-b-2 border-brand-500 text-white" : "text-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <p className="text-center text-sm text-white/50">Loading...</p>}
        <ul className="space-y-2">
          {data?.leaderboard.map((entry, index) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={index + 1} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
        {rank <= 3 ? <Trophy className={`h-4 w-4 ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-amber-600"}`} /> : rank}
      </div>
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-bold">
          {entry.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold">@{entry.username}</p>
        <p className="text-xs text-white/50">{entry.totalPoints} pts</p>
      </div>
    </li>
  );
}
