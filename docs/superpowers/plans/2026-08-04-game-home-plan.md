# Game-First Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the review feed as the home screen with a game-first home (`PlayHome`) and move the feed to a secondary "Browse" tab, while keeping all existing deep links functional.

**Architecture:** A new eagerly-loaded `PlayHome` composes small, focused subcomponents (`DailyDropCard`, `ChallengeInbox`, `StreakHeader`, `ContinuePlaying`) and derives today's drop from the existing feed API. Tapping a round navigates to `/play/:id`, a new route that wraps the existing `Feed` component for single-review guessing. A Zustand `playStore` tracks played/unplayed state client-side. The router remaps `/` → `/play`, `/browse` → existing feed, and adds `/activity`. `BottomNav` is updated to Play / Browse / Create / Activity / Profile.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, TanStack Query v5, Zustand, Tailwind CSS, Framer Motion, Lucide icons, Playwright.

## Global Constraints
- First open after update lands on the game home; the video feed becomes a secondary tab ("Browse").
- A new user can start their first round within 2 taps of app open.
- Pending challenges and streak status are visible above the fold on a 375px viewport.
- Old feed route remains fully functional for deep links.
- Keep BottomNav from Prompt 9; reorder tabs: Play, Browse, Create, Activity, Profile.
- Do not modify feed internals; only its position in navigation changes.
- Lazy-load the Browse tab; Play tab is the only eagerly-loaded route.
- All new UI uses existing Tailwind design tokens.
- No new backend endpoints. Daily Drop sourced from existing `/api/feed`.
- Activity tab is a lightweight placeholder; no notifications backend.

---

## Task 1: Create Zustand play store

**Files:**
- Create: `apps/web/src/stores/playStore.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `usePlayStore` hook with state and actions used by `PlayHome` and subcomponents.

- [ ] **Step 1: Write the store implementation**

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface PlayState {
  dailyDropReviewId: string | null;
  playedReviewIds: string[];
  pendingChallengeCount: number;
  markPlayed: (reviewId: string) => void;
  setDailyDrop: (reviewId: string | null) => void;
  setPendingChallengeCount: (count: number) => void;
  isPlayed: (reviewId: string) => boolean;
}

function buildStorageKey(userId: string | null | undefined) {
  return userId ? `sr-play-store-${userId}` : "sr-play-store-anon";
}

export const usePlayStore = create<PlayState>()(
  persist(
    (set, get) => ({
      dailyDropReviewId: null,
      playedReviewIds: [],
      pendingChallengeCount: 0,
      markPlayed: (reviewId) =>
        set((state) => ({
          playedReviewIds: state.playedReviewIds.includes(reviewId)
            ? state.playedReviewIds
            : [...state.playedReviewIds, reviewId],
        })),
      setDailyDrop: (reviewId) => set({ dailyDropReviewId: reviewId }),
      setPendingChallengeCount: (count) => set({ pendingChallengeCount: count }),
      isPlayed: (reviewId) => get().playedReviewIds.includes(reviewId),
    }),
    {
      name: "sr-play-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        playedReviewIds: state.playedReviewIds,
        dailyDropReviewId: state.dailyDropReviewId,
      }),
    }
  )
);

export function setPlayStoreUser(userId: string | null | undefined) {
  // Zustand persist uses a static key; to scope per user we rely on
  // the consumer reading `user?.id` and passing it to helpers where needed.
  // This function is a placeholder hook location for future user scoping.
}
```

- [ ] **Step 2: Add unit test for store logic**

Create `apps/web/src/stores/__tests__/playStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { usePlayStore } from "../playStore";

describe("playStore", () => {
  beforeEach(() => {
    usePlayStore.setState({
      dailyDropReviewId: null,
      playedReviewIds: [],
      pendingChallengeCount: 0,
    });
  });

  it("marks a review as played", () => {
    usePlayStore.getState().markPlayed("r1");
    expect(usePlayStore.getState().isPlayed("r1")).toBe(true);
    expect(usePlayStore.getState().isPlayed("r2")).toBe(false);
  });

  it("does not duplicate played ids", () => {
    usePlayStore.getState().markPlayed("r1");
    usePlayStore.getState().markPlayed("r1");
    expect(usePlayStore.getState().playedReviewIds).toEqual(["r1"]);
  });

  it("updates pending challenge count", () => {
    usePlayStore.getState().setPendingChallengeCount(3);
    expect(usePlayStore.getState().pendingChallengeCount).toBe(3);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm --filter web test -- src/stores/__tests__/playStore.test.ts`

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/stores/playStore.ts apps/web/src/stores/__tests__/playStore.test.ts
git commit -m "feat(play): add playStore for daily drop and played-state tracking"
```

---

## Task 2: Create game home subcomponents

### 2a. StreakHeader

**Files:**
- Create: `apps/web/src/components/play/StreakHeader.tsx`

**Interfaces:**
- Consumes: `useGamification()` return shape `{ data?: GamificationState, isLoading: boolean }`
- Produces: `<StreakHeader />` rendered inside `PlayHome`

- [ ] **Step 1: Implement StreakHeader**

```tsx
import { Flame, Shield, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useGamification } from "../../hooks/useGamification";

export function StreakHeader() {
  const { data, isLoading } = useGamification();

  if (isLoading || !data) {
    return (
      <div className="flex h-20 items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl animate-pulse">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  const { streakDays, longestStreak, totalPoints } = data;

  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/30 to-red-500/30">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Flame className="h-6 w-6 text-orange-400" />
          </motion.div>
        </div>
        <div>
          <p className="text-2xl font-black leading-none text-white">{streakDays}</p>
          <p className="text-xs font-bold text-white/50">day streak</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {streakDays > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20">
            <Shield className="h-3.5 w-3.5" />
            Streak active
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 px-3 py-1.5 text-sm font-bold text-rose-300 ring-1 ring-rose-500/30">
          <Star className="h-4 w-4 text-rose-400" />
          {totalPoints.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
```

### 2b. DailyDropCard

**Files:**
- Create: `apps/web/src/components/play/DailyDropCard.tsx`

**Interfaces:**
- Consumes: `FeedReview | undefined`, `isPlayed: boolean`, `onPlay: () => void`, `isLoading: boolean`
- Produces: `<DailyDropCard review={...} isPlayed={...} onPlay={...} isLoading={...} />`

- [ ] **Step 2: Implement DailyDropCard**

```tsx
import { Play, Check, Eye } from "lucide-react";
import { motion } from "framer-motion";
import type { FeedReview } from "../../hooks/useFeed";

interface DailyDropCardProps {
  review?: FeedReview;
  isPlayed: boolean;
  onPlay: () => void;
  isLoading: boolean;
}

export function DailyDropCard({ review, isPlayed, onPlay, isLoading }: DailyDropCardProps) {
  if (isLoading) {
    return (
      <div className="aspect-[4/5] w-full animate-pulse rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="h-full w-full rounded-2xl bg-white/10" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <Eye className="mb-2 h-8 w-8 text-white/30" />
        <p className="text-sm font-bold text-white/50">No rounds available right now.</p>
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/10 text-left"
    >
      {review.thumbnailUrl ? (
        <img
          src={review.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/20 to-violet-500/20">
          <Play className="h-12 w-12 text-white/40" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md">
        Daily Drop
      </div>

      {isPlayed && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
          <Check className="h-3.5 w-3.5" />
          Played
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="line-clamp-2 text-lg font-bold leading-tight text-white">
          {review.productTag ?? review.caption ?? "Mystery review"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            <Play className="h-3.5 w-3.5" />
            {isPlayed ? "Play again" : "Play today's guess"}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
```

### 2c. ChallengeInbox

**Files:**
- Create: `apps/web/src/components/play/ChallengeInbox.tsx`

**Interfaces:**
- Consumes: `useChallenges()` return shape
- Produces: `<ChallengeInbox />` rendered inside `PlayHome`

- [ ] **Step 3: Implement ChallengeInbox**

```tsx
import { useChallenges } from "../../hooks/useChallenges";
import { User, Check, X, Trophy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
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
      {pending.map((challenge) => (
        <div
          key={challenge.id}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl"
        >
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
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAccept(challenge.id)}
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
      ))}
    </div>
  );
}
```

### 2d. ContinuePlaying

**Files:**
- Create: `apps/web/src/components/play/ContinuePlaying.tsx`

**Interfaces:**
- Consumes: `FeedReview[]`, `playedReviewIds: string[]`, `onSelect: (review: FeedReview) => void`
- Produces: `<ContinuePlaying reviews={...} playedReviewIds={...} onSelect={...} />`

- [ ] **Step 4: Implement ContinuePlaying**

```tsx
import { Play, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { FeedReview } from "../../hooks/useFeed";

interface ContinuePlayingProps {
  reviews: FeedReview[];
  playedReviewIds: string[];
  onSelect: (review: FeedReview) => void;
}

export function ContinuePlaying({ reviews, playedReviewIds, onSelect }: ContinuePlayingProps) {
  if (reviews.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-xs font-black uppercase tracking-wider text-white/40">Continue playing</h3>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
        {reviews.map((review) => {
          const played = playedReviewIds.includes(review.id);
          return (
            <motion.button
              key={review.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect(review)}
              className="group relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 text-left"
            >
              {review.thumbnailUrl ? (
                <img src={review.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5">
                  <Play className="h-8 w-8 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {played && (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-500/80 p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="line-clamp-2 text-xs font-bold leading-tight text-white">
                  {review.productTag ?? review.caption ?? "Review"}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run component render tests (snapshot/existence)**

Create `apps/web/src/components/play/__tests__/StreakHeader.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakHeader } from "../StreakHeader";
import * as useGamification from "../../../hooks/useGamification";

vi.mock("../../../hooks/useGamification");

describe("StreakHeader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders streak and points", () => {
    vi.spyOn(useGamification, "useGamification").mockReturnValue({
      data: {
        streakDays: 5,
        longestStreak: 12,
        totalPoints: 1280,
        totalReviews: 3,
        totalGuesses: 10,
        rank: 4,
        totalRanked: 100,
        achievements: [],
      },
      isLoading: false,
      isError: false,
      isSuccess: true,
      status: "success",
    } as ReturnType<typeof useGamification.useGamification>);

    render(<StreakHeader />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("1,280")).toBeInTheDocument();
  });
});
```

Run: `pnpm --filter web test -- src/components/play/__tests__/StreakHeader.test.tsx`

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/play

git commit -m "feat(play): add StreakHeader, DailyDropCard, ChallengeInbox, ContinuePlaying"
```

---

## Task 3: Create PlayHome page

**Files:**
- Create: `apps/web/src/pages/PlayHome.tsx`
- Modify: `apps/web/src/stores/playStore.ts` (add `firstRoundStartTime` if needed, but keep in analytics lib instead)

**Interfaces:**
- Consumes: `useFeed`, `useGamification`, `useChallenges`, `usePlayStore`, `trackEvent`
- Produces: `<PlayHome />` page component

- [ ] **Step 1: Implement PlayHome**

```tsx
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed } from "../hooks/useFeed";
import { useChallenges } from "../hooks/useChallenges";
import { usePlayStore } from "../stores/playStore";
import { StreakHeader } from "../components/play/StreakHeader";
import { DailyDropCard } from "../components/play/DailyDropCard";
import { ChallengeInbox } from "../components/play/ChallengeInbox";
import { ContinuePlaying } from "../components/play/ContinuePlaying";
import { trackEvent } from "../lib/analytics";

const APP_OPEN_TIME_KEY = "sr_app_open_time";
const FIRST_ROUND_TRACKED_KEY = "sr_first_round_tracked";

export function PlayHome() {
  const navigate = useNavigate();
  const { data, isLoading: feedLoading } = useFeed("for-you");
  const { discoverChallenges } = useChallenges();
  const markPlayed = usePlayStore((s) => s.markPlayed);
  const setDailyDrop = usePlayStore((s) => s.setDailyDrop);
  const setPendingChallengeCount = usePlayStore((s) => s.setPendingChallengeCount);
  const isPlayed = usePlayStore((s) => s.isPlayed);
  const playedIds = usePlayStore((s) => s.playedReviewIds);

  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];

  const { dailyDrop, continueList } = useMemo(() => {
    const firstUnplayed = reviews.find((r) => !isPlayed(r.id));
    const drop = firstUnplayed ?? reviews[0];
    const rest = reviews.filter((r) => r.id !== drop?.id).slice(0, 10);
    return { dailyDrop: drop, continueList: rest };
  }, [reviews, isPlayed]);

  useEffect(() => {
    setDailyDrop(dailyDrop?.id ?? null);
  }, [dailyDrop?.id, setDailyDrop]);

  useEffect(() => {
    setPendingChallengeCount(discoverChallenges.length);
  }, [discoverChallenges.length, setPendingChallengeCount]);

  const appOpenTimeRef = useRef<number | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem(APP_OPEN_TIME_KEY);
    appOpenTimeRef.current = stored ? Number(stored) : Date.now();
    if (!stored) {
      sessionStorage.setItem(APP_OPEN_TIME_KEY, String(appOpenTimeRef.current));
    }
  }, []);

  function trackFirstRoundStart() {
    const tracked = sessionStorage.getItem(FIRST_ROUND_TRACKED_KEY);
    if (tracked || appOpenTimeRef.current == null) return;
    const elapsedMs = Date.now() - appOpenTimeRef.current;
    trackEvent("first_round_start_time", { elapsedMs });
    sessionStorage.setItem(FIRST_ROUND_TRACKED_KEY, "1");
  }

  function handlePlay(reviewId: string) {
    trackFirstRoundStart();
    navigate(`/play/${reviewId}`);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4" style={{ scrollbarWidth: "none" }}>
      <StreakHeader />

      <section className="space-y-2">
        <DailyDropCard
          review={dailyDrop}
          isPlayed={dailyDrop ? isPlayed(dailyDrop.id) : false}
          onPlay={() => dailyDrop && handlePlay(dailyDrop.id)}
          isLoading={feedLoading}
        />
      </section>

      <ChallengeInbox />

      <ContinuePlaying
        reviews={continueList}
        playedReviewIds={playedIds}
        onSelect={(review) => handlePlay(review.id)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add PlayHome existence test**

Create `apps/web/src/pages/__tests__/PlayHome.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PlayHome } from "../PlayHome";

vi.mock("../../hooks/useFeed", () => ({
  useFeed: () => ({
    data: { pages: [{ reviews: [] }] },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useChallenges", () => ({
  useChallenges: () => ({
    discoverChallenges: [],
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useGamification", () => ({
  useGamification: () => ({
    data: {
      streakDays: 1,
      longestStreak: 1,
      totalPoints: 0,
      totalReviews: 0,
      totalGuesses: 0,
      rank: 1,
      totalRanked: 1,
      achievements: [],
    },
    isLoading: false,
  }),
}));

const queryClient = new QueryClient();

describe("PlayHome", () => {
  it("renders the game home", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PlayHome />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Daily Drop")).toBeInTheDocument();
  });
});
```

Run: `pnpm --filter web test -- src/pages/__tests__/PlayHome.test.tsx`

Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/PlayHome.tsx apps/web/src/pages/__tests__/PlayHome.test.tsx
git commit -m "feat(play): add PlayHome page composing game sections"
```

---

## Task 3b: Create PlayRound page

**Files:**
- Create: `apps/web/src/pages/PlayRound.tsx`

**Interfaces:**
- Consumes: `useParams<{ id: string }>`, `api.get(`/api/reviews/${id}`)`, existing `Feed` component
- Produces: `<PlayRound />` eagerly-loaded route component

- [ ] **Step 1: Implement PlayRound**

```tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Loading } from "../components/common/Loading";
import { Feed } from "../components/feed/Feed";
import { usePlayStore } from "../stores/playStore";
import { trackFirstRoundComplete, trackDailyDropPlayed } from "../lib/analytics";
import type { FeedReview } from "../hooks/useFeed";

export function PlayRound() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<FeedReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealData, setRevealData] = useState<
    Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>
  >(new Map());
  const [selectedRatings, setSelectedRatings] = useState<Map<string, number>>(new Map());
  const markPlayed = usePlayStore((s) => s.markPlayed);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/reviews/${id}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as FeedReview & { rating: number };
        setReview({
          ...data,
          likeCount: data.likeCount ?? 0,
          guessCount: data.guessCount ?? 0,
          commentCount: data.commentCount ?? 0,
          shareCount: data.shareCount ?? 0,
          product: data.product ?? { id: "", name: data.productTag ?? "Product", category: "" },
        });
      })
      .catch(() => setError("Could not load this round."))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  function selectRating(reviewId: string, rating: number) {
    setSelectedRatings((prev) => new Map(prev).set(reviewId, rating));
  }

  async function handleReveal(reviewId: string) {
    const guess = selectedRatings.get(reviewId);
    if (guess === undefined) return;
    try {
      const guessRes = await api.post(`/api/guesses/${reviewId}`, { guessedRating: guess });
      const revealRes = await api.get(`/api/guesses/${reviewId}/reveal`);
      setRevealData((prev) =>
        new Map(prev).set(reviewId, {
          rating: revealRes.data.rating,
          score: guessRes.data.guess.score,
          totalGuesses: revealRes.data.totalGuesses,
          distribution: revealRes.data.distribution,
        })
      );
      trackFirstRoundComplete({ reviewId });
      trackDailyDropPlayed({ reviewId });
      markPlayed(reviewId);
    } catch {
      // ignore
    } finally {
      setRevealed((prev) => new Set(prev).add(reviewId));
    }
  }

  function handlePlayAgain() {
    navigate("/play");
  }

  if (loading) return <Loading />;
  if (error || !review) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
        <p className="text-lg font-bold">{error || "Round not found"}</p>
        <button onClick={() => navigate("/play")} className="mt-4 text-rose-400">Back to Play</button>
      </div>
    );
  }

  return (
    <Feed
      reviews={[review]}
      selectedRatings={selectedRatings}
      onSelectRating={selectRating}
      onReveal={handleReveal}
      revealed={revealed}
      revealData={revealData}
      onPlayAgain={handlePlayAgain}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/PlayRound.tsx
git commit -m "feat(play): add PlayRound single-review guess route"
```

---

## Task 4: Create Activity placeholder page

**Files:**
- Create: `apps/web/src/pages/Activity.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `<Activity />` lazy-loaded route component

- [ ] **Step 1: Implement Activity placeholder**

```tsx
import { Bell } from "lucide-react";

export function Activity() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5">
        <Bell className="h-8 w-8 text-white/30" />
      </div>
      <h1 className="text-xl font-black text-white">Activity</h1>
      <p className="mt-2 max-w-xs text-sm font-medium text-white/50">
        Notifications, challenge updates, and friend activity will appear here soon.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Activity.tsx
git commit -m "feat(activity): add placeholder Activity page"
```

---

## Task 5: Update router and BottomNav

### 5a. Update router.tsx

**Files:**
- Modify: `apps/web/src/router.tsx`

**Interfaces:**
- Consumes: existing page components
- Produces: updated route config

- [ ] **Step 1: Apply router changes**

Edit `apps/web/src/router.tsx`:

```tsx
import { createBrowserRouter, Outlet, useParams, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthGuard } from "./components/AuthGuard";
import { PlayHome } from "./pages/PlayHome"; // eager
import { PlayRound } from "./pages/PlayRound"; // eager
import { Home } from "./pages/Home"; // Browse / legacy feed
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ReviewDetail } from "./pages/ReviewDetail";
import { Status } from "./pages/Status";
import { Loading } from "./components/common/Loading";

const Record = lazy(() => import("./pages/Record").then((m) => ({ default: m.Record })));
const Profile = lazy(() => import("./pages/Profile").then((m) => ({ default: m.Profile })));
const Viral = lazy(() => import("./pages/Viral").then((m) => ({ default: m.Viral })));
const InviteLanding = lazy(() => import("./pages/InviteLanding").then((m) => ({ default: m.InviteLanding })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));
const Analytics = lazy(() => import("./pages/Analytics").then((m) => ({ default: m.Analytics })));
const Activity = lazy(() => import("./pages/Activity").then((m) => ({ default: m.Activity })));

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

function DeepLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/review/${id}`} replace />;
}

function LegacyHomeRedirect() {
  return <Navigate to="/play" replace />;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/status", element: <Status /> },
      { path: "/invite/:code", element: <LazyWrapper><InviteLanding /></LazyWrapper> },
      { path: "/review/:id", element: <ReviewDetail /> },
      { path: "/s/:id", element: <DeepLinkRedirect /> },
      {
        element: <ProtectedRoute><Outlet /></ProtectedRoute>,
        children: [
          { path: "/", element: <LegacyHomeRedirect /> },
          { path: "/play", element: <PlayHome /> },
          { path: "/play/:id", element: <PlayRound /> },
          { path: "/browse", element: <LazyWrapper><Home /></LazyWrapper> },
          { path: "/record", element: <LazyWrapper><Record /></LazyWrapper> },
          { path: "/activity", element: <LazyWrapper><Activity /></LazyWrapper> },
          { path: "/viral", element: <LazyWrapper><Viral /></LazyWrapper> },
          { path: "/leaderboard", element: <LazyWrapper><LeaderboardPage /></LazyWrapper> },
          { path: "/profile/:id", element: <LazyWrapper><Profile /></LazyWrapper> },
          { path: "/admin", element: <LazyWrapper><Admin /></LazyWrapper> },
          { path: "/analytics", element: <LazyWrapper><Analytics /></LazyWrapper> },
        ],
      },
    ],
  },
]);
```

### 5b. Update BottomNav

**Files:**
- Modify: `apps/web/src/components/layout/BottomNav.tsx`

**Interfaces:**
- Consumes: React Router location
- Produces: reordered navigation tabs

- [ ] **Step 2: Apply BottomNav changes**

Replace the `LINKS` array in `apps/web/src/components/layout/BottomNav.tsx`:

```tsx
import { Gamepad2, Compass, PlusCircle, Bell, User } from "lucide-react";

const LINKS = [
  { to: "/play", icon: Gamepad2, label: "Play" },
  { to: "/browse", icon: Compass, label: "Browse" },
  { to: "/record", icon: PlusCircle, label: "Create" },
  { to: "/activity", icon: Bell, label: "Activity" },
  { to: "/profile/me", icon: User, label: "Profile" },
];
```

Update `isLinkActive` to treat `/` as active for `/play` (legacy deep links to `/` redirect, but nav should highlight Play on both):

```tsx
function isLinkActive(pathname: string, to: string): boolean {
  if (to === "/play") return pathname === "/play" || pathname === "/";
  if (to === "/profile/me") return pathname.startsWith("/profile");
  return pathname.startsWith(to);
}
```

- [ ] **Step 3: Add analytics tab_switch event on nav tap**

Inside `BottomNav`, add `trackEvent` import and emit on click. Wrap the existing `onClick`:

```tsx
import { trackEvent } from "../../lib/analytics";

// inside component:
const [previousPath, setPreviousPath] = useState(location.pathname);

function handleNavClick(to: string) {
  if (to !== location.pathname) {
    trackEvent("tab_switched", { from: previousPath, to });
    setPreviousPath(to);
  }
}
```

Update each `NavLink` `onClick` to call `handleNavClick(link.to)` before the existing logic.

- [ ] **Step 4: Run web typecheck and tests**

Run:
```bash
pnpm typecheck
pnpm --filter web test
```

Expected: typecheck clean; web tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/router.tsx apps/web/src/components/layout/BottomNav.tsx
git commit -m "feat(nav): reorder BottomNav to Play/Browse/Create/Activity/Profile; route / to /play; add /browse and /activity"
```

---

## Task 6: Mark reviews as played after reveal

**Files:**
- Modify: `apps/web/src/pages/Home.tsx`

**Interfaces:**
- Consumes: `usePlayStore`
- Produces: played state persisted when a round is completed in the Browse feed

- [ ] **Step 1: Add markPlayed to Home.tsx handleReveal**

Edit `apps/web/src/pages/Home.tsx`:

```tsx
import { usePlayStore } from "../stores/playStore";

export function Home() {
  const markPlayed = usePlayStore((s) => s.markPlayed);
  // ... existing state ...

  async function handleReveal(reviewId: string) {
    const guess = selectedRatings.get(reviewId);
    try {
      if (guess !== undefined) {
        const guessRes = await api.post(`/api/guesses/${reviewId}`, { guessedRating: guess });
        const revealRes = await api.get(`/api/guesses/${reviewId}/reveal`);
        setRevealData((prev) =>
          new Map(prev).set(reviewId, {
            rating: revealRes.data.rating,
            score: guessRes.data.guess.score,
            totalGuesses: revealRes.data.totalGuesses,
            distribution: revealRes.data.distribution,
          })
        );
        markPlayed(reviewId);
        trackFirstRoundComplete({ reviewId });
        trackDailyDropPlayed({ reviewId });
      }
    } catch {
      // ignore
    } finally {
      setRevealed((prev) => new Set(prev).add(reviewId));
    }
  }

  // ... rest unchanged ...
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Home.tsx
git commit -m "feat(play): mark reviews as played after reveal in browse feed"
```

---

## Task 7: Add Playwright test

**Files:**
- Create: `e2e/play-home.spec.ts`

**Interfaces:**
- Consumes: existing auth helpers and app URL
- Produces: passing E2E test

- [ ] **Step 1: Write the E2E test**

```ts
import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers/auth";

test("new user lands on Play home and starts a round within 2 taps", async ({ page }) => {
  const { email, password } = await registerUser(page);
  await page.goto("/");

  // Should redirect to /play
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByText("Daily Drop")).toBeVisible();
  await expect(page.getByText("Play today's guess")).toBeVisible();

  // Tap the Daily Drop card (tap 1)
  await page.getByRole("button", { name: /Play today's guess/i }).click();

  // Should be on the play round route with the guess UI visible
  await expect(page).toHaveURL(/\/play\//);
  await expect(page.getByText(/Guess the rating/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test**

Run: `pnpm e2e -- e2e/play-home.spec.ts`

Expected: test passes.

- [ ] **Step 3: Commit**

```bash
git add e2e/play-home.spec.ts
git commit -m "test(e2e): verify new user lands on Play home and starts a round"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`

Expected: clean exit.

- [ ] **Step 2: Run all web tests**

Run: `pnpm --filter web test`

Expected: all tests pass.

- [ ] **Step 3: Run all API tests (regression)**

Run: `pnpm --filter api test`

Expected: all tests pass.

- [ ] **Step 4: Build production web bundle**

Run: `pnpm --filter web build`

Expected: build succeeds.

- [ ] **Step 5: Final commit if any fixes**

```bash
git commit -m "fix(play): address type/test issues from game-home rollout" || true
```

---

## Spec Coverage Checklist

- [x] PlayHome page created with Daily Drop, Challenge Inbox, Streak Header, Continue Playing — Tasks 2, 3
- [x] PlayRound route (`/play/:id`) wraps existing `Feed` for single-review guessing — Task 3b
- [x] Router changes: `/` → `/play`, `/browse` → feed, `/activity` placeholder — Task 5
- [x] BottomNav reordered to Play/Browse/Create/Activity/Profile — Task 5
- [x] Lazy loading: only `PlayHome` and `PlayRound` eager; others lazy — Task 5
- [x] Existing Tailwind tokens used throughout — all component tasks
- [x] Old feed route preserved for deep links — Task 5
- [x] playStore for daily drop and played state — Task 1
- [x] Analytics: tab switches and first-round-start time — Task 5, 3
- [x] StreakHeader shows streak shield placeholder for freeze status (backend lacks freeze field) — Task 2a
- [x] Playwright test for ≤2 taps — Task 7
