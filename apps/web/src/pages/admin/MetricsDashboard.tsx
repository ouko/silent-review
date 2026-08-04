import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Loading } from "../../components/common/Loading";
import { BarChart3, Users, Share2, Flame, Activity } from "lucide-react";

interface Cohort {
  date: string;
  signups: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

interface FunnelData {
  dates: string[];
  opened: number[];
  firstRound: number[];
  d7Return: number[];
}

interface DashboardData {
  cohorts: Cohort[];
  kFactor: number | null;
  shareRate: number | null;
  streakEstablishment: number | null;
  funnel: FunnelData;
}

function formatPct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function MetricsDashboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["analytics-dashboard", days],
    queryFn: async () => (await api.get(`/api/analytics/dashboard?days=${days}`)).data,
  });

  if (isLoading || !data) return <Loading />;

  const latestCohort = data.cohorts[0];
  const funnelTotals = data.funnel.dates.length
    ? {
        opened: data.funnel.opened.reduce((a, b) => a + b, 0),
        firstRound: data.funnel.firstRound.reduce((a, b) => a + b, 0),
        d7Return: data.funnel.d7Return.reduce((a, b) => a + b, 0),
      }
    : { opened: 0, firstRound: 0, d7Return: 0 };

  const maxFunnel = Math.max(funnelTotals.opened, 1);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">Metrics</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/15"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="K-factor"
          value={data.kFactor !== null ? data.kFactor.toFixed(2) : "—"}
          sub="installs / invites sent"
        />
        <MetricCard
          icon={<Share2 className="h-4 w-4" />}
          label="Share rate"
          value={formatPct(data.shareRate)}
          sub="players who shared"
        />
        <MetricCard
          icon={<Flame className="h-4 w-4" />}
          label="Streak establishment"
          value={formatPct(data.streakEstablishment)}
          sub="7-day streak in 14 days"
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Latest D7 retention"
          value={formatPct(latestCohort?.d7 ?? null)}
          sub={latestCohort ? `${latestCohort.signups} signups` : ""}
        />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Funnel</h3>
        <div className="mt-4 space-y-3">
          <FunnelBar label="App open" value={funnelTotals.opened} max={maxFunnel} color="bg-white/20" />
          <FunnelBar
            label="First round complete"
            value={funnelTotals.firstRound}
            max={maxFunnel}
            color="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500"
          />
          <FunnelBar label="D7 return" value={funnelTotals.d7Return} max={maxFunnel} color="bg-emerald-500" />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Retention cohorts</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-white/40">
                <th className="pb-2 font-semibold">Signup date</th>
                <th className="pb-2 font-semibold">Signups</th>
                <th className="pb-2 font-semibold">D1</th>
                <th className="pb-2 font-semibold">D7</th>
                <th className="pb-2 font-semibold">D30</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.date} className="border-t border-white/10">
                  <td className="py-2 text-white/80">{c.date}</td>
                  <td className="py-2 text-white/80">{c.signups}</td>
                  <td className="py-2 font-semibold text-emerald-300">{formatPct(c.d1)}</td>
                  <td className="py-2 font-semibold text-emerald-300">{formatPct(c.d7)}</td>
                  <td className="py-2 font-semibold text-emerald-300">{formatPct(c.d30)}</td>
                </tr>
              ))}
              {data.cohorts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/40">
                    No cohort data yet. Run the nightly rollup or seed events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-white/50">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black tracking-tighter text-white">{value}</p>
      <p className="text-[10px] text-white/40">{sub}</p>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-white/70">
        <span className="font-semibold">{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
