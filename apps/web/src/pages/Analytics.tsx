import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { FeedTabs } from "../components/feed/FeedTabs";
import { Loading } from "../components/common/Loading";
import { StatsChart } from "../components/stats/StatsChart";
import { BarChart3, Search, Star, Target } from "lucide-react";

const TABS = [
  { id: "creator", label: "Creator" },
  { id: "products", label: "Products" },
];

interface Engagement {
  likes: number;
  comments: number;
  guesses: number;
  shares: number;
}

interface Rates {
  completionRate: number | null;
  engagementRate: number | null;
}

interface TopReview {
  id: string;
  rating: number;
  likeCount: number;
  guessCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  product: { id: string; name: string };
}

interface CreatorAnalytics extends Rates {
  totalReviews: number;
  publishedReviews: number;
  averageRating: number;
  engagement: Engagement;
  guessAccuracy: number | null;
  sharesByProvider: Record<string, number>;
  topReviews: TopReview[];
}

interface ProductAnalytics extends Rates {
  product: { id: string; name: string; category: string; brand: string | null };
  totalReviews: number;
  averageRating: number;
  distribution: number[];
  engagement: Engagement;
  guessAccuracy: number | null;
  sharesByProvider: Record<string, number>;
  topReviews: TopReview[];
}

interface ProductHit {
  id: string;
  name: string;
  category: string;
}

export function Analytics() {
  const [tab, setTab] = useState("creator");

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Analytics</h1>
        </div>

        <div className="sticky top-0 z-10 bg-black/80 pb-2 backdrop-blur-xl">
          <FeedTabs tabs={TABS} activeId={tab} onSelect={setTab} />
        </div>

        {tab === "creator" && <CreatorPanel />}
        {tab === "products" && <ProductsPanel />}
      </div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm">
      <p className="text-xl font-black tracking-tighter gradient-text">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );
}

function EngagementRow({ engagement }: { engagement: Engagement }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <BigStat label="Likes" value={engagement.likes.toLocaleString()} />
      <BigStat label="Comments" value={engagement.comments.toLocaleString()} />
      <BigStat label="Guesses" value={engagement.guesses.toLocaleString()} />
      <BigStat label="Shares" value={engagement.shares.toLocaleString()} />
    </div>
  );
}

function pct(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(0)}%`;
}

function RatesRow({ rates }: { rates: Rates }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm">
        <p className="text-xl font-black tracking-tighter gradient-text">{pct(rates.completionRate)}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Completion rate</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm">
        <p className="text-xl font-black tracking-tighter gradient-text">{pct(rates.engagementRate)}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Engagement rate</p>
      </div>
    </div>
  );
}

function SharesChips({ sharesByProvider }: { sharesByProvider: Record<string, number> }) {
  const entries = Object.entries(sharesByProvider);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([provider, count]) => (
        <span key={provider} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
          {provider}: {count}
        </span>
      ))}
    </div>
  );
}

function TopReviews({ reviews }: { reviews: TopReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-white/50">Top reviews</p>
      {reviews.map((r) => {
        const total = r.likeCount + r.commentCount + r.guessCount;
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-500 text-sm font-black text-white">
              {r.rating}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{r.product.name}</p>
              <p className="text-xs text-white/50">
                {r.likeCount} likes · {r.commentCount} comments · {r.guessCount} guesses
              </p>
            </div>
            <span className="text-xs font-bold text-white/60">{total} total</span>
          </div>
        );
      })}
    </div>
  );
}

function GuessAccuracy({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <Target className="h-5 w-5 text-emerald-400" />
      <p className="text-sm text-white/70">
        {value === null ? (
          "No guesses on these reviews yet."
        ) : (
          <>
            <span className="font-bold text-white">{(value * 100).toFixed(0)}%</span> of guesses were exactly right
          </>
        )}
      </p>
    </div>
  );
}

function CreatorPanel() {
  const { data, isLoading } = useQuery<CreatorAnalytics>({
    queryKey: ["analytics-creator"],
    queryFn: async () => (await api.get("/api/analytics/creator")).data,
  });

  if (isLoading || !data) return <Loading />;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <BigStat label="Reviews" value={String(data.totalReviews)} />
        <BigStat label="Published" value={String(data.publishedReviews)} />
        <BigStat label="Avg rating" value={data.averageRating ? data.averageRating.toFixed(1) : "—"} />
      </div>
      <EngagementRow engagement={data.engagement} />
      <RatesRow rates={data} />
      <GuessAccuracy value={data.guessAccuracy} />
      <SharesChips sharesByProvider={data.sharesByProvider} />
      <TopReviews reviews={data.topReviews} />
    </div>
  );
}

function ProductsPanel() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProductHit | null>(null);

  const { data: hits } = useQuery<{ products: ProductHit[] }>({
    queryKey: ["product-search", q],
    queryFn: async () => (await api.get("/api/products/search", { params: { q } })).data,
    enabled: q.trim().length > 0 && !selected,
  });

  const { data, isLoading } = useQuery<ProductAnalytics>({
    queryKey: ["analytics-product", selected?.id],
    queryFn: async () => (await api.get(`/api/analytics/products/${selected!.id}`)).data,
    enabled: !!selected,
  });

  return (
    <div className="flex flex-col gap-3">
      {!selected && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a product to see its analytics"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/20"
            />
          </div>
          {hits && hits.products.length > 0 && (
            <div className="flex flex-col gap-2">
              {hits.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                >
                  <p className="text-sm font-bold text-white">{p.name}</p>
                  <p className="text-xs text-white/50">{p.category}</p>
                </button>
              ))}
            </div>
          )}
          <p className="py-8 text-center text-sm text-white/40">
            Merchant view: review volume, average rating, rating distribution, engagement, and reach for any product.
          </p>
        </>
      )}

      {selected && (
        <>
          <button onClick={() => setSelected(null)} className="self-start text-xs font-semibold text-white/50 hover:text-white">
            ← change product
          </button>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-bold text-white">{data?.product.name ?? selected.name}</p>
            <p className="text-xs text-white/50">{data?.product.brand ?? data?.product.category ?? selected.category}</p>
          </div>

          {isLoading || !data ? (
            <Loading />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <BigStat label="Reviews" value={String(data.totalReviews)} />
                <BigStat label="Avg rating" value={data.averageRating ? data.averageRating.toFixed(1) : "—"} />
                <div className="flex items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <p className="text-xl font-black tracking-tighter gradient-text">
                    {data.averageRating ? data.averageRating.toFixed(1) : "—"}
                  </p>
                </div>
              </div>
              <StatsChart distribution={data.distribution} totalGuesses={data.engagement.guesses} />
              <EngagementRow engagement={data.engagement} />
              <RatesRow rates={data} />
              <GuessAccuracy value={data.guessAccuracy} />
              <SharesChips sharesByProvider={data.sharesByProvider} />
              <TopReviews reviews={data.topReviews} />
            </>
          )}
        </>
      )}
    </div>
  );
}
