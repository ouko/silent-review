import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Loading } from "../../components/common/Loading";
import { Sparkles, Check, X, Calendar, Clock, ImageOff, AlertCircle, ChevronDown } from "lucide-react";

interface ContentQueueReview {
  id: string;
  thumbnailUrl: string | null;
  caption: string | null;
  rating: number;
  product: { name: string; category: string };
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface ContentQueueItem {
  id: string;
  guessabilityScore: number;
  status: "CANDIDATE" | "APPROVED" | "REJECTED" | "SCHEDULED";
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
  review: ContentQueueReview;
}

interface ContentQueueResponse {
  curations: ContentQueueItem[];
  nextCursor?: string;
}

const QUERY_KEY = ["admin-content-queue"];

export function ContentQueue() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | undefined>();
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<ContentQueueResponse>({
    queryKey: [...QUERY_KEY, cursor],
    queryFn: async () =>
      (await api.get("/api/admin/content-queue", { params: { limit: 20, cursor } })).data,
  });

  const curate = useMutation({
    mutationFn: async () => (await api.post<{ created: number }>("/api/admin/content-queue/curate", { limit: 20 })).data,
    onSuccess: () => {
      setCursor(undefined);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, scheduledDate }: { id: string; status: string; scheduledDate?: string }) => {
      return (await api.patch<ContentQueueItem>(`/api/admin/content-queue/${id}/status`, { status, scheduledDate })).data;
    },
    onSuccess: () => {
      setSchedulingId(null);
      setScheduleDate("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingId || !scheduleDate) return;
    updateStatus.mutate({ id: schedulingId, status: "SCHEDULED", scheduledDate: scheduleDate });
  };

  if (isLoading) return <Loading />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <p className="text-sm font-bold text-white/70">Couldn’t load the content queue.</p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">Content Queue</h2>
        </div>
        <button
          onClick={() => curate.mutate()}
          disabled={curate.isPending}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500/20 px-3 py-2 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {curate.isPending ? "Finding…" : "Find more candidates"}
        </button>
      </div>

      {curate.isSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <Check className="h-4 w-4" />
          Found {curate.data.created} new candidate(s).
        </div>
      )}
      {curate.error && (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {(curate.error as { response?: { data?: { error?: string } } }).response?.data?.error ??
            "Failed to find candidates."}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {data.curations.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              {item.review.thumbnailUrl ? (
                <img
                  src={item.review.thumbnailUrl}
                  alt=""
                  className="h-20 w-14 rounded-xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="flex h-20 w-14 items-center justify-center rounded-xl bg-white/10">
                  <ImageOff className="h-5 w-5 text-white/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-white">{item.review.product.name}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-white/50">
                  {item.review.product.category} · Rating {item.review.rating}/10
                </p>
                <p className="text-xs text-white/50">
                  by @{item.review.user.username}
                  {item.review.user.displayName && ` · ${item.review.user.displayName}`}
                </p>
                {item.review.caption && (
                  <p className="mt-1 truncate text-xs text-white/60">{item.review.caption}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-emerald-300">Score: {item.guessabilityScore}</span>
                  {item.scheduledDate && (
                    <span className="flex items-center gap-1 text-amber-300">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.scheduledDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {item.status !== "APPROVED" && (
                <button
                  onClick={() => updateStatus.mutate({ id: item.id, status: "APPROVED" })}
                  disabled={updateStatus.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
              )}
              {item.status !== "REJECTED" && (
                <button
                  onClick={() => updateStatus.mutate({ id: item.id, status: "REJECTED" })}
                  disabled={updateStatus.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              )}
              {item.status !== "SCHEDULED" && (
                <button
                  onClick={() => {
                    setSchedulingId(item.id);
                    setScheduleDate(item.scheduledDate?.slice(0, 10) ?? "");
                  }}
                  disabled={updateStatus.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 py-2 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
                >
                  <Calendar className="h-3.5 w-3.5" /> Schedule
                </button>
              )}
              {item.status === "SCHEDULED" && (
                <button
                  onClick={() => updateStatus.mutate({ id: item.id, status: "APPROVED" })}
                  disabled={updateStatus.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-bold text-white/70 transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                  <Clock className="h-3.5 w-3.5" /> Unschedule
                </button>
              )}
            </div>
          </div>
        ))}

        {data.curations.length === 0 && (
          <p className="py-12 text-center text-sm text-white/50">
            No curated reviews yet. Click “Find more candidates” to start.
          </p>
        )}
      </div>

      {data.nextCursor && (
        <button
          onClick={() => setCursor(data.nextCursor)}
          className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
        >
          <ChevronDown className="h-4 w-4" /> Load more
        </button>
      )}

      {schedulingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSchedule}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl"
          >
            <h3 className="text-lg font-black tracking-tight text-white">Schedule review</h3>
            <p className="mt-1 text-xs text-white/50">Pick a UTC date to feature this review.</p>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
                Date (UTC)
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />
            </div>

            {updateStatus.error && (
              <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {(updateStatus.error as { response?: { data?: { error?: string } } }).response?.data
                  ?.error ?? "Update failed."}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSchedulingId(null);
                  setScheduleDate("");
                }}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!scheduleDate || updateStatus.isPending}
                className="flex-1 rounded-xl bg-violet-500/20 py-2.5 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
              >
                {updateStatus.isPending ? "Saving…" : "Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ContentQueueItem["status"] }) {
  const styles: Record<ContentQueueItem["status"], string> = {
    CANDIDATE: "bg-white/10 text-white/70",
    APPROVED: "bg-emerald-500/20 text-emerald-300",
    REJECTED: "bg-rose-500/20 text-rose-300",
    SCHEDULED: "bg-amber-500/20 text-amber-300",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
