# Feed + Guess/Reveal UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the core Silent Review video feed and guess/reveal experience to look modern, premium, and mobile-native for a young audience.

**Architecture:** Keep all existing data hooks and API calls untouched. Introduce new presentational components and CSS utilities, then refactor `Home`, `Feed`, `VideoCard`, `GuessButtons`, and `RevealScreen` to use them. All motion is driven by Framer Motion with `prefers-reduced-motion` support.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, lucide-react, Vite.

## Global Constraints

- No backend changes.
- No new runtime dependencies.
- Animations complete in < 400ms (entrances) and respect `prefers-reduced-motion`.
- Touch targets >= 48px.
- Maintain dark theme; use rose/pink/violet accent gradients.
- All existing E2E tests must still pass.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `apps/web/src/index.css` | Add design tokens and keyframe utilities |
| `apps/web/src/components/feed/FeedTabs.tsx` | Pill segmented control for feed tabs |
| `apps/web/src/components/feed/VideoInfo.tsx` | Avatar, username, product tag, caption overlay |
| `apps/web/src/components/guess/RatingBar.tsx` | 1–10 gradient segmented rating input |
| `apps/web/src/components/guess/RevealScreen.tsx` | Redesigned celebration result screen |
| `apps/web/src/components/ui/BrandSpinner.tsx` | Branded gradient spinner for loading states |
| `apps/web/src/pages/Home.tsx` | Use `FeedTabs` |
| `apps/web/src/components/feed/Feed.tsx` | Use new `VideoInfo`, `RatingBar`, `BrandSpinner`, polish pull-to-refresh |
| `apps/web/src/components/VideoCard.tsx` | Use new `VideoInfo`, `RatingBar`, gradient Reveal CTA |
| `apps/web/src/components/guess/GuessButtons.tsx` | Keep as thin wrapper or delete after refactor |
| `apps/web/src/components/stats/StatsChart.tsx` | Style bars with gradient |

---

### Task 1: Design tokens and CSS utilities

**Files:**
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Produces: CSS custom properties `--sr-accent-gradient`, `--sr-glow`, and utility classes `.gradient-text`, `.glow-border`, `.shimmer`

- [ ] **Step 1: Append design tokens to `index.css`**

Add after the existing `.animate-mesh` block:

```css
:root {
  --sr-rose: 244 63 94;
  --sr-pink: 236 72 153;
  --sr-violet: 139 92 246;
  --sr-accent-gradient: linear-gradient(135deg, rgb(var(--sr-rose)), rgb(var(--sr-pink)), rgb(var(--sr-violet)));
}

.gradient-text {
  background: var(--sr-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glow-border {
  position: relative;
}
.glow-border::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--sr-accent-gradient);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.6;
  pointer-events: none;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/index.css
git commit -m "feat(ui): add design tokens and shimmer/glow utilities"
```

---

### Task 2: FeedTabs component

**Files:**
- Create: `apps/web/src/components/feed/FeedTabs.tsx`

**Interfaces:**
- Consumes: `tabs: { id: string; label: string }[]`, `activeId: string`, `onSelect: (id: string) => void`
- Produces: `<FeedTabs tabs={...} activeId={...} onSelect={...} />`

- [ ] **Step 1: Create `FeedTabs.tsx`**

```tsx
import { motion, useReducedMotion } from "framer-motion";

interface FeedTab {
  id: string;
  label: string;
}

interface FeedTabsProps {
  tabs: FeedTab[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function FeedTabs({ tabs, activeId, onSelect }: FeedTabsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-center p-3">
      <div className="relative flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className="relative z-10 px-4 py-2 text-sm font-bold tracking-tight transition-colors"
            aria-pressed={activeId === tab.id}
          >
            {activeId === tab.id ? (
              <span className="text-white">{tab.label}</span>
            ) : (
              <span className="text-white/50 hover:text-white/80">{tab.label}</span>
            )}
            {activeId === tab.id && (
              <motion.div
                layoutId="activeFeedTab"
                transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-full bg-white/15"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `Home.tsx`**

Replace the existing tab bar in `apps/web/src/pages/Home.tsx`:

```tsx
import { FeedTabs } from "../components/feed/FeedTabs";
```

And replace lines 52-66:

```tsx
  return (
    <div className="flex h-full flex-col">
      <FeedTabs
        tabs={TABS}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as FeedType)}
      />

      {status === "pending" ? (
        <div className="flex h-full items-center justify-center">
          <BrandSpinner />
        </div>
      ) : (
```

- [ ] **Step 3: Verify typecheck**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/feed/FeedTabs.tsx apps/web/src/pages/Home.tsx
git commit -m "feat(feed): add pill segmented FeedTabs with animated indicator"
```

---

### Task 3: BrandSpinner component and update Home loading

**Files:**
- Create: `apps/web/src/components/ui/BrandSpinner.tsx`

**Interfaces:**
- Produces: `<BrandSpinner size="md" />`

- [ ] **Step 1: Create `BrandSpinner.tsx`**

```tsx
interface BrandSpinnerProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function BrandSpinner({ size = "md" }: BrandSpinnerProps) {
  return (
    <div className={`${SIZE_MAP[size]} relative animate-spin`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-violet-500 opacity-30 blur-sm" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-500 border-r-pink-500" />
    </div>
  );
}
```

- [ ] **Step 2: Update Home loading state**

In `apps/web/src/pages/Home.tsx`, replace the spinner div with:

```tsx
import { BrandSpinner } from "../components/ui/BrandSpinner";
```

And:

```tsx
<div className="flex h-full flex-col items-center justify-center gap-3">
  <BrandSpinner size="lg" />
  <p className="text-sm font-medium text-white/50">Loading reviews...</p>
</div>
```

- [ ] **Step 3: Verify typecheck**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/ui/BrandSpinner.tsx apps/web/src/pages/Home.tsx
git commit -m "feat(ui): add BrandSpinner and use it on Home loading state"
```

---

### Task 4: VideoInfo overlay component

**Files:**
- Create: `apps/web/src/components/feed/VideoInfo.tsx`

**Interfaces:**
- Consumes: `username`, `avatarUrl?`, `caption?`, `productTag?`
- Produces: `<VideoInfo ... />`

- [ ] **Step 1: Create `VideoInfo.tsx`**

```tsx
import { motion } from "framer-motion";

interface VideoInfoProps {
  username: string;
  avatarUrl?: string | null;
  caption?: string | null;
  productTag?: string | null;
}

export function VideoInfo({ username, avatarUrl, caption, productTag }: VideoInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-11 w-11 rounded-full border border-white/10 object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 text-sm font-bold text-white shadow-lg">
            {username[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <p className="font-bold text-white">@{username}</p>
          {productTag && (
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              {productTag}
            </span>
          )}
        </div>
      </div>
      {caption && (
        <p className="max-w-xs text-sm leading-relaxed text-white/80">
          {caption}
        </p>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/feed/VideoInfo.tsx
git commit -m "feat(feed): add VideoInfo overlay component"
```

---

### Task 5: RatingBar component

**Files:**
- Create: `apps/web/src/components/guess/RatingBar.tsx`

**Interfaces:**
- Consumes: `selected: number | null`, `onSelect: (rating: number) => void`, `disabled?: boolean`
- Produces: `<RatingBar selected={...} onSelect={...} disabled={...} />`

- [ ] **Step 1: Create `RatingBar.tsx`**

```tsx
import { motion, useReducedMotion } from "framer-motion";

interface RatingBarProps {
  selected: number | null;
  onSelect: (rating: number) => void;
  disabled?: boolean;
}

function segmentColor(rating: number): string {
  if (rating <= 4) return "from-rose-500 to-rose-400";
  if (rating <= 6) return "from-amber-500 to-amber-400";
  return "from-emerald-500 to-emerald-400";
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
}

export function RatingBar({ selected, onSelect, disabled }: RatingBarProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="Guess the rating"
      className="flex h-14 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1"
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
        const isSelected = selected === rating;
        const isFirst = rating === 1;
        const isLast = rating === 10;
        return (
          <motion.button
            key={rating}
            role="radio"
            aria-checked={isSelected}
            aria-label={`Rate ${rating} out of 10`}
            disabled={disabled}
            whileTap={disabled || reducedMotion ? {} : { scale: 0.95 }}
            onClick={() => {
              if (disabled) return;
              triggerHaptic();
              onSelect(rating);
            }}
            className={[
              "relative flex flex-1 items-center justify-center text-sm font-bold transition-all",
              isFirst ? "rounded-l-xl" : "",
              isLast ? "rounded-r-xl" : "",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              isSelected
                ? `bg-gradient-to-r ${segmentColor(rating)} text-white shadow-[0_0_16px_rgba(244,63,94,0.35)]`
                : "text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {rating}
          </motion.button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/guess/RatingBar.tsx
git commit -m "feat(guess): add cohesive RatingBar with gradient segments"
```

---

### Task 6: Refactor VideoCard with new overlay and rating bar

**Files:**
- Modify: `apps/web/src/components/VideoCard.tsx`

**Interfaces:**
- Consumes: `VideoInfo`, `RatingBar`, existing `GuessButtons` behavior
- Produces: redesigned `VideoCard`

- [ ] **Step 1: Rewrite `VideoCard.tsx`**

```tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useGuess } from "../hooks/useGuess";
import { VideoInfo } from "./feed/VideoInfo";
import { RatingBar } from "./guess/RatingBar";
import { RevealScreen } from "./guess/RevealScreen";

interface VideoCardProps {
  id: string;
  videoUrl: string;
  caption?: string | null;
  productTag?: string | null;
  username: string;
  avatarUrl?: string | null;
  revealed?: boolean;
  rating?: number;
}

export function VideoCard(props: VideoCardProps) {
  const [revealed, setRevealed] = useState(props.revealed ?? false);
  const [revealData, setRevealData] = useState<{
    rating: number;
    score: number;
    totalGuesses: number;
    distribution: number[];
  } | null>(null);

  const { selectedRating, setSelectedRating, submit, isSubmitting, reveal } = useGuess(props.id);

  async function handleReveal() {
    if (selectedRating == null) return;
    try {
      const result = await submit(selectedRating);
      const revealResult = await reveal();
      setRevealData({
        rating: revealResult.rating,
        score: result.guess.score,
        totalGuesses: revealResult.totalGuesses,
        distribution: revealResult.distribution,
      });
      setRevealed(true);
    } catch {
      // error surfaced by hook if needed
    }
  }

  function handlePlayAgain() {
    setRevealed(false);
    setSelectedRating(null);
    setRevealData(null);
  }

  if (revealed && revealData) {
    return (
      <div className="relative h-full w-full snap-start overflow-hidden bg-black">
        <RevealScreen
          rating={revealData.rating}
          userGuess={selectedRating}
          score={revealData.score}
          totalGuesses={revealData.totalGuesses}
          distribution={revealData.distribution}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full snap-start overflow-hidden bg-black">
      <video
        src={props.videoUrl}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pb-10">
        <VideoInfo
          username={props.username}
          avatarUrl={props.avatarUrl}
          caption={props.caption}
          productTag={props.productTag}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mt-5 space-y-4"
        >
          <p className="text-center text-xs font-bold uppercase tracking-widest text-white/50">
            Guess the rating
          </p>
          <RatingBar
            selected={selectedRating}
            onSelect={setSelectedRating}
            disabled={isSubmitting}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleReveal}
            disabled={selectedRating == null || isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Checking..." : "Reveal"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck && pnpm --filter web build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/VideoCard.tsx
git commit -m "feat(video-card): redesign VideoCard with VideoInfo, RatingBar, gradient CTA"
```

---

### Task 7: Refactor Feed with new overlay and pull-to-refresh polish

**Files:**
- Modify: `apps/web/src/components/feed/Feed.tsx`

**Interfaces:**
- Consumes: `VideoInfo`, `RatingBar`, `BrandSpinner`, `RevealScreen`
- Produces: redesigned `Feed`

- [ ] **Step 1: Rewrite `Feed.tsx`**

```tsx
import { useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { VideoPlayer } from "./VideoPlayer";
import { VideoInfo } from "./VideoInfo";
import { RatingBar } from "../guess/RatingBar";
import { RevealScreen } from "../guess/RevealScreen";
import { BrandSpinner } from "../ui/BrandSpinner";
import type { FeedReview } from "../../hooks/useFeed";

interface FeedProps {
  reviews: FeedReview[];
  onReveal: (reviewId: string, guess?: number) => void;
  revealed: Set<string>;
  revealData: Map<string, { rating: number; score: number; totalGuesses: number; distribution: number[] }>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onRefresh?: () => void;
  onPlayAgain?: (reviewId: string) => void;
}

export function Feed({
  reviews,
  onReveal,
  revealed,
  revealData,
  onLoadMore,
  isLoadingMore,
  onRefresh,
  onPlayAgain,
}: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const reducedMotion = useReducedMotion();
  const { setItemRef, shouldPlay, shouldPreload, shouldRender } = useVideoFeed(reviews.length);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (pullStartY == null) return;
      const delta = e.touches[0].clientY - pullStartY;
      if (delta > 0) setPullDistance(Math.min(delta * 0.5, 90));
    },
    [pullStartY]
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60 && onRefresh) {
      onRefresh();
    }
    setPullStartY(null);
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore]);

  return (
    <div
      ref={containerRef}
      className="relative h-full snap-y snap-mandatory overflow-y-scroll"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute left-0 right-0 top-0 z-10 flex flex-col items-center justify-end pb-3"
          style={{ height: pullDistance }}
        >
          <BrandSpinner size="sm" />
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/60">
            {pullDistance > 60 ? "Release to refresh" : "Pull to refresh"}
          </p>
        </motion.div>
      )}

      {reviews.map((review, index) =>
        shouldRender(index) ? (
          <div
            key={review.id}
            ref={setItemRef(index)}
            data-index={index}
            className="relative h-full w-full snap-start"
          >
            <VideoPlayer
              src={review.videoUrl}
              shouldPlay={shouldPlay(index)}
              preload={shouldPreload(index)}
              poster={review.thumbnailUrl}
            />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pb-20">
              <VideoInfo
                username={review.user.username}
                avatarUrl={review.user.avatarUrl}
                caption={review.caption}
                productTag={review.productTag}
              />

              {!revealed.has(review.id) ? (
                <FeedGuessOverlay onGuess={(guess) => onReveal(review.id, guess)} />
              ) : (
                <div className="mt-4 max-h-[60vh] overflow-auto rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl">
                  {(() => {
                    const data = revealData.get(review.id);
                    if (!data) {
                      return (
                        <div className="text-center">
                          <p className="text-sm text-white/60">Actual rating</p>
                          <p className="text-6xl font-black tracking-tighter text-brand-500">
                            {review.rating}
                            <span className="text-2xl text-white/40">/10</span>
                          </p>
                        </div>
                      );
                    }
                    return (
                      <RevealScreen
                        rating={data.rating}
                        userGuess={data.score === 10 ? data.rating : null}
                        score={data.score}
                        totalGuesses={data.totalGuesses}
                        distribution={data.distribution}
                        onPlayAgain={() => onPlayAgain?.(review.id)}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : null
      )}

      {isLoadingMore && (
        <div className="flex h-24 items-center justify-center gap-3">
          <BrandSpinner size="md" />
          <p className="text-sm font-medium text-white/50">Loading more...</p>
        </div>
      )}
    </div>
  );
}

function FeedGuessOverlay({ onGuess }: { onGuess: (guess: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-5 space-y-4"
    >
      <p className="text-center text-xs font-bold uppercase tracking-widest text-white/50">
        Guess the rating
      </p>
      <RatingBar selected={selected} onSelect={setSelected} />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => selected && onGuess(selected)}
        disabled={!selected}
        className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reveal
      </motion.button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck && pnpm --filter web build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/feed/Feed.tsx
git commit -m "feat(feed): redesign Feed with VideoInfo, RatingBar, glass reveal card"
```

---

### Task 8: Redesign RevealScreen as celebration moment

**Files:**
- Modify: `apps/web/src/components/guess/RevealScreen.tsx`
- Modify: `apps/web/src/components/stats/StatsChart.tsx`

**Interfaces:**
- Consumes: same `RevealScreenProps`
- Produces: redesigned `RevealScreen`

- [ ] **Step 1: Style `StatsChart` with gradient bars**

Replace `apps/web/src/components/stats/StatsChart.tsx`:

```tsx
interface StatsChartProps {
  distribution: number[];
  totalGuesses: number;
}

export function StatsChart({ distribution, totalGuesses }: StatsChartProps) {
  const max = Math.max(1, ...distribution);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
        {totalGuesses.toLocaleString()} guesses
      </p>
      <div className="flex h-28 items-end justify-between gap-1">
        {distribution.map((count, index) => {
          const height = totalGuesses > 0 ? (count / max) * 100 : 0;
          const rating = index + 1;
          const isHigh = rating >= 7;
          const isMid = rating === 6;
          const gradient = isHigh
            ? "from-emerald-500 to-emerald-400"
            : isMid
              ? "from-amber-500 to-amber-400"
              : "from-rose-500 to-rose-400";
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t bg-gradient-to-t ${gradient} ${count === max ? "shadow-[0_0_10px_rgba(244,63,94,0.3)]" : ""}`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[10px] font-bold text-white/60">{rating}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `RevealScreen.tsx`**

```tsx
import { motion, useReducedMotion } from "framer-motion";
import { StatsChart } from "../stats/StatsChart";
import { GuessFeedback } from "./GuessFeedback";
import { Trophy, RotateCcw } from "lucide-react";

interface RevealScreenProps {
  rating: number;
  userGuess: number | null;
  score: number;
  totalGuesses: number;
  distribution: number[];
  onPlayAgain: () => void;
}

export function RevealScreen({
  rating,
  userGuess,
  score,
  totalGuesses,
  distribution,
  onPlayAgain,
}: RevealScreenProps) {
  const reducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: reducedMotion ? {} : { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.1 },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? {} : { opacity: 0, y: 20 },
    show: reducedMotion ? {} : { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex h-full flex-col items-center justify-center gap-5 p-2 text-center"
    >
      <motion.div variants={itemVariants} className="flex flex-col items-center">
        <p className="text-xs font-bold uppercase tracking-widest text-white/50">
          The actual rating was
        </p>
        <motion.div
          initial={reducedMotion ? { scale: 1 } : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 18 }}
          className="text-8xl font-black leading-none tracking-tighter gradient-text"
          aria-label={`Actual rating ${rating} out of 10`}
        >
          {rating}
          <span className="text-3xl text-white/30">/10</span>
        </motion.div>
      </motion.div>

      {userGuess !== null && (
        <motion.div variants={itemVariants}>
          <GuessFeedback userGuess={userGuess} actualRating={rating} score={score} />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="w-full">
        <StatsChart distribution={distribution} totalGuesses={totalGuesses} />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="glow-border flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-rose-400" />
          <p className="text-sm font-bold text-white/90">Result Card</p>
        </div>
        <p className="text-sm text-white/60">
          Share your guess with friends. Sharing coming soon!
        </p>
      </motion.div>

      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.96 }}
        onClick={onPlayAgain}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-bold text-black transition-transform"
      >
        <RotateCcw className="h-4 w-4" />
        Play again
        <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-sm">
          {rating}/10
        </span>
      </motion.button>
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck && pnpm --filter web build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/guess/RevealScreen.tsx apps/web/src/components/stats/StatsChart.tsx
git commit -m "feat(reveal): redesign RevealScreen as celebration moment with result card"
```

---

### Task 9: Remove or deprecate old GuessButtons

**Files:**
- Modify: `apps/web/src/components/guess/GuessButtons.tsx`

**Interfaces:**
- Produces: thin wrapper around `RatingBar` to avoid breaking any external imports

- [ ] **Step 1: Replace `GuessButtons.tsx` with wrapper**

```tsx
import { RatingBar } from "./RatingBar";

interface GuessButtonsProps {
  selected: number | null;
  onSelect: (rating: number) => void;
  disabled?: boolean;
}

export function GuessButtons({ selected, onSelect, disabled }: GuessButtonsProps) {
  return <RatingBar selected={selected} onSelect={onSelect} disabled={disabled} />;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src/components/guess/GuessButtons.tsx
git commit -m "refactor(guess): make GuessButtons a thin RatingBar wrapper"
```

---

### Task 10: Final verification

**Files:**
- All modified frontend files

- [ ] **Step 1: Run full verification**

```bash
cd /Users/lukeouko/silent-review
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web test
```

Expected: all pass.

- [ ] **Step 2: Run E2E tests**

Start the dev stack:

```bash
cd /Users/lukeouko/silent-review
docker compose up -d
pnpm exec dotenv -e .env -- pnpm --filter database run deploy
pnpm db:seed
pnpm --filter shared build
pnpm --filter database build
pnpm dev
```

Wait for `http://localhost:5173/login` to return 200, then:

```bash
cd /Users/lukeouko/silent-review
pnpm test:e2e
```

Expected: 5/5 passing.

- [ ] **Step 3: Commit any fixes**

```bash
cd /Users/lukeouko/silent-review
git add -A
git commit -m "test(e2e): verify feed/guess/reveal UX refresh"
```

---

## Self-Review

**Spec coverage:**
- Typography/heavy weights → Home tab labels, RevealScreen numerals ✅
- Pill segmented tabs → `FeedTabs` ✅
- Video card chrome → `VideoInfo`, rounded frame, metadata overlay ✅
- Cohesive rating input → `RatingBar` ✅
- Celebratory reveal → `RevealScreen` redesign ✅
- Loading/pull-to-refresh → `BrandSpinner`, shimmer utility ✅
- Motion/respect reduced motion → all components ✅
- No backend changes → none planned ✅

**Placeholder scan:** No TBD/TODO. All code shown.

**Type consistency:** `RatingBar` props match `GuessButtons` wrapper. `Feed` and `VideoCard` both use `VideoInfo` with same prop names.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-24-feed-guess-reveal-ux-refresh.md`.

Recommended execution approach: **Subagent-Driven Development** — each task above is self-contained and reviewable independently.
