import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Loading } from "../../components/common/Loading";
import { CalendarDays, Search, Sparkles, ImageOff, Check, AlertCircle } from "lucide-react";

interface ArchiveReview {
  id: string;
  thumbnailUrl: string | null;
  product: { name: string; category: string };
}

interface ArchiveItem {
  id: string;
  date: string;
  reviewId: string;
  review: ArchiveReview;
  finalRating?: number | null;
  isOverride?: boolean;
}

interface ArchiveResponse {
  items: ArchiveItem[];
  nextCursor?: string;
}

interface FeedReview {
  id: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productTag: string | null;
  rating: number;
  product: { id: string; name: string; category: string };
  user: { username: string; displayName: string | null };
}

interface FeedResponse {
  reviews: FeedReview[];
  nextCursor?: string;
}

function toISODateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODateUTC(d);
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const DAYS_TO_SHOW = 30;
const ARCHIVE_QUERY_KEY = ["admin-dailydrop-schedule"];
const FEED_QUERY_KEY = ["admin-dailydrop-feed"];

export function DailyDropSchedule() {
  const queryClient = useQueryClient();
  const today = useMemo(() => toISODateUTC(new Date()), []);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  const [reviewSearch, setReviewSearch] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<ArchiveResponse>({
    queryKey: ARCHIVE_QUERY_KEY,
    queryFn: async () =>
      (await api.get("/api/dailydrop/archive", { params: { future: true, limit: 100 } })).data,
  });

  const { data: feedData, isLoading: feedLoading } = useQuery<FeedResponse>({
    queryKey: FEED_QUERY_KEY,
    queryFn: async () => (await api.get("/api/feed", { params: { limit: 50 } })).data,
    enabled: overrideDate !== null,
  });

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ArchiveItem>();
    for (const item of data?.items ?? []) {
      const dateKey = toISODateUTC(new Date(item.date));
      map.set(dateKey, item);
    }
    return map;
  }, [data]);

  const upcomingDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      days.push(addDaysUTC(today, i));
    }
    return days;
  }, [today]);

  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    if (!q) return feedData?.reviews ?? [];
    return (feedData?.reviews ?? []).filter((r) => {
      return (
        r.product.name.toLowerCase().includes(q) ||
        r.product.category.toLowerCase().includes(q) ||
        r.user.username.toLowerCase().includes(q) ||
        (r.user.displayName ?? "").toLowerCase().includes(q) ||
        (r.caption ?? "").toLowerCase().includes(q)
      );
    });
  }, [feedData, reviewSearch]);

  const selectedReview = useMemo(
    () => filteredReviews.find((r) => r.id === selectedReviewId) ?? null,
    [filteredReviews, selectedReviewId]
  );

  const scheduleMutation = useMutation({
    mutationFn: async () => (await api.post<{ scheduled: number }>("/api/dailydrop/schedule")).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARCHIVE_QUERY_KEY });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ date, reviewId }: { date: string; reviewId: string }) => {
      return (await api.post<ArchiveItem>("/api/dailydrop/override", { date, reviewId })).data;
    },
    onSuccess: () => {
      setOverrideDate(null);
      setSelectedReviewId(null);
      setReviewSearch("");
      queryClient.invalidateQueries({ queryKey: ARCHIVE_QUERY_KEY });
    },
  });

  const handleSetOverride = (date: string) => {
    setOverrideDate(date);
    setSelectedReviewId(null);
    setReviewSearch("");
  };

  const submitOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate || !selectedReviewId) return;
    overrideMutation.mutate({ date: overrideDate, reviewId: selectedReviewId });
  };

  if (isLoading) return <Loading />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <p className="text-sm font-bold text-white/70">Couldn’t load the Daily Drop schedule.</p>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-500">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">Daily Drop</h2>
        </div>
        <button
          onClick={() => scheduleMutation.mutate()}
          disabled={scheduleMutation.isPending}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500/20 px-3 py-2 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {scheduleMutation.isPending ? "Running…" : "Run scheduler"}
        </button>
      </div>

      {scheduleMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <Check className="h-4 w-4" />
          Scheduler ran — {scheduleMutation.data.scheduled} day(s) scheduled.
        </div>
      )}
      {scheduleMutation.error && (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {(scheduleMutation.error as { response?: { data?: { error?: string } } }).response?.data
            ?.error ?? "Scheduler failed."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingDays.map((date) => {
          const item = scheduleMap.get(date);
          return (
            <DayCard
              key={date}
              date={date}
              item={item}
              onSetOverride={() => handleSetOverride(date)}
            />
          );
        })}
      </div>

      {overrideDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl">
            <h3 className="text-lg font-black tracking-tight text-white">
              Set override — {formatDateLabel(overrideDate)}
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Pick a review to feature on this UTC date.
            </p>

            <form onSubmit={submitOverride} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
                  Date (UTC)
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
                  Search reviews
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Product, category, creator…"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-1">
                {feedLoading ? (
                  <Loading />
                ) : filteredReviews.length === 0 ? (
                  <p className="py-6 text-center text-sm text-white/40">No reviews found.</p>
                ) : (
                  filteredReviews.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReviewId(r.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                        selectedReviewId === r.id
                          ? "bg-violet-500/20 text-white"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {r.thumbnailUrl ? (
                        <img
                          src={r.thumbnailUrl}
                          alt=""
                          className="h-14 w-10 rounded-lg object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-white/10">
                          <ImageOff className="h-4 w-4 text-white/40" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{r.product.name}</p>
                        <p className="truncate text-xs text-white/50">
                          {r.product.category} · @{r.user.username}
                        </p>
                        <p className="text-[10px] text-white/40">Rating: {r.rating}/10</p>
                      </div>
                      {selectedReviewId === r.id && <Check className="h-4 w-4 text-violet-300" />}
                    </button>
                  ))
                )}
              </div>

              {selectedReview && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Selected
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{selectedReview.product.name}</p>
                  <p className="text-xs text-white/50">
                    {selectedReview.product.category} · @{selectedReview.user.username}
                  </p>
                </div>
              )}

              {overrideMutation.error && (
                <p className="text-sm text-rose-300">
                  {(overrideMutation.error as { response?: { data?: { error?: string } } }).response
                    ?.data?.error ?? "Override failed."}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideDate(null)}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedReviewId || overrideMutation.isPending}
                  className="flex-1 rounded-xl bg-violet-500/20 py-2.5 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
                >
                  {overrideMutation.isPending ? "Saving…" : "Set override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({
  date,
  item,
  onSetOverride,
}: {
  date: string;
  item: ArchiveItem | undefined;
  onSetOverride: () => void;
}) {
  const isToday = date === toISODateUTC(new Date());

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur-sm ${
        isToday
          ? "border-violet-500/30 bg-violet-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm font-bold ${isToday ? "text-violet-300" : "text-white"}`}>
          {formatDateLabel(date)}
        </p>
        {item?.isOverride && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
            override
          </span>
        )}
      </div>

      {item ? (
        <div className="flex items-center gap-3">
          {item.review.thumbnailUrl ? (
            <img
              src={item.review.thumbnailUrl}
              alt=""
              className="h-16 w-12 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-16 w-12 items-center justify-center rounded-xl bg-white/10">
              <ImageOff className="h-5 w-5 text-white/40" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{item.review.product.name}</p>
            <p className="truncate text-xs text-white/50">{item.review.product.category}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <p className="text-xs text-white/40">Not scheduled</p>
          <button
            onClick={onSetOverride}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15"
          >
            Set override
          </button>
        </div>
      )}

      {item && (
        <button
          onClick={onSetOverride}
          className="mt-1 w-full rounded-xl bg-white/5 py-1.5 text-xs font-bold text-white/70 transition-colors hover:bg-white/10"
        >
          Override
        </button>
      )}
    </div>
  );
}
