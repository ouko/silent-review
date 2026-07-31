import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { FeedTabs } from "../components/feed/FeedTabs";
import { Loading } from "../components/common/Loading";
import { ShieldCheck, Check, X, Ban, Undo2, Search, Flag, Eye } from "lucide-react";

interface AdminStats {
  users: number;
  bannedUsers: number;
  publishedReviews: number;
  pendingModeration: number;
}

interface PendingReview {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null };
  product: { id: string; name: string };
  videoModeration: { status: string; reasons: string[]; score: number | null } | null;
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  banned: boolean;
  _count: { reviews: number; followers: number };
}

const TABS = [
  { id: "moderation", label: "Moderation" },
  { id: "users", label: "Users" },
];

export function Admin() {
  const currentUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState("moderation");
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get("/api/admin/stats")).data,
    enabled: currentUser?.role === "ADMIN",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-moderation"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  if (currentUser?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Admin</h1>
        </div>

        {stats && (
          <div className="mb-4 grid grid-cols-4 gap-2">
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Banned" value={stats.bannedUsers} />
            <StatCard label="Reviews" value={stats.publishedReviews} />
            <StatCard label="Pending" value={stats.pendingModeration} highlight={stats.pendingModeration > 0} />
          </div>
        )}

        <div className="sticky top-0 z-10 bg-black/80 pb-2 backdrop-blur-xl">
          <FeedTabs tabs={TABS} activeId={tab} onSelect={setTab} />
        </div>

        {tab === "moderation" && <ModerationQueue onAction={invalidate} />}
        {tab === "users" && <UsersPanel onAction={invalidate} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center backdrop-blur-sm ${highlight ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
      <p className="text-xl font-black tracking-tighter gradient-text">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );
}

function ModerationQueue({ onAction }: { onAction: () => void }) {
  const { data, isLoading } = useQuery<{ reviews: PendingReview[] }>({
    queryKey: ["admin-moderation"],
    queryFn: async () => (await api.get("/api/admin/moderation")).data,
  });

  const action = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      await api.post(`/api/admin/moderation/${id}/${decision}`);
    },
    onSuccess: onAction,
  });

  if (isLoading || !data) return <Loading />;

  if (data.reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Check className="h-8 w-8 text-emerald-400" />
        <p className="text-sm font-bold text-white/70">Queue is clear</p>
        <p className="text-xs text-white/40">Nothing waiting for review.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            {r.thumbnailUrl ? (
              <img src={r.thumbnailUrl} alt="" className="h-20 w-14 rounded-xl object-cover ring-1 ring-white/10" />
            ) : (
              <div className="flex h-20 w-14 items-center justify-center rounded-xl bg-white/10">
                <Eye className="h-5 w-5 text-white/40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{r.product.name}</p>
              <p className="text-xs text-white/50">
                by{" "}
                <Link to={`/profile/${r.user.id}`} className="font-semibold text-white/70 hover:text-white">
                  @{r.user.username}
                </Link>{" "}
                · {new Date(r.createdAt).toLocaleString()}
              </p>
              {r.caption && <p className="mt-1 truncate text-xs text-white/60">{r.caption}</p>}
              {r.videoModeration && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-300/90">
                  <Flag className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {r.videoModeration.status}
                    {r.videoModeration.reasons.length > 0 && ` — ${r.videoModeration.reasons[0]}`}
                  </span>
                </div>
              )}
              <a href={r.videoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-white/50 underline hover:text-white">
                watch video
              </a>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => action.mutate({ id: r.id, decision: "approve" })}
              disabled={action.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 py-2 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => action.mutate({ id: r.id, decision: "reject" })}
              disabled={action.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 py-2 text-sm font-bold text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersPanel({ onAction }: { onAction: () => void }) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isLoading } = useQuery<{ users: AdminUser[]; nextCursor?: string }>({
    queryKey: ["admin-users", submitted],
    queryFn: async () => (await api.get("/api/admin/users", { params: { q: submitted } })).data,
  });

  const action = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "ban" | "unban" }) => {
      await api.post(`/api/admin/users/${id}/${decision}`);
    },
    onSuccess: onAction,
  });

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username, name, or email"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/20"
          />
        </div>
        <button type="submit" className="rounded-2xl bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15">
          Search
        </button>
      </form>

      {isLoading || !data ? (
        <Loading />
      ) : data.users.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/50">No users found.</p>
      ) : (
        data.users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {u.displayName ?? u.username}
                {u.role === "ADMIN" && <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-300">admin</span>}
                {u.banned && <span className="ml-2 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-300">banned</span>}
              </p>
              <p className="truncate text-xs text-white/50">@{u.username} · {u.email}</p>
              <p className="mt-0.5 text-[11px] text-white/40">
                {u._count.reviews} reviews · {u._count.followers} followers · joined {new Date(u.createdAt).toLocaleDateString()}
              </p>
            </div>
            {u.role !== "ADMIN" && (
              <button
                onClick={() => action.mutate({ id: u.id, decision: u.banned ? "unban" : "ban" })}
                disabled={action.isPending}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                  u.banned ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                }`}
              >
                {u.banned ? (<><Undo2 className="h-3.5 w-3.5" /> Unban</>) : (<><Ban className="h-3.5 w-3.5" /> Ban</>)}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
