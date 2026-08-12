# Feed Performance and Offline Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Browse feed load instantly on repeat visits, survive reloads, and remain usable offline while keeping changes small and low-risk.

**Architecture:** Add TanStack Query persistence to IndexedDB for feed/daily-drop/challenge keys, prefetch the for-you feed as soon as the user is authenticated, keep previous tab data as placeholder data while switching tabs, preload the Browse route chunk from the bottom nav, extend the service worker to cache thumbnails and short API responses, and tune server-side Redis TTLs.

**Tech Stack:** React 18, Vite, TanStack Query v5, IndexedDB (idb-keyval), Workbox-style custom service worker, Express + Redis.

## Global Constraints
- No PII or auth tokens persisted to IndexedDB.
- Service worker must still allow Range requests for video playback to hit the network.
- All changes must pass `pnpm --filter web typecheck` and `pnpm --filter api typecheck`.
- E2E tests must run on Mobile Chrome project.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/queryClient.ts` | Shared `QueryClient` instance + persistence config. |
| `apps/web/src/main.tsx` | Renders `PersistQueryClientProvider` instead of `QueryClientProvider`. |
| `apps/web/src/hooks/usePrefetchFeed.ts` | Triggers `prefetchInfiniteQuery` for for-you feed once per session. |
| `apps/web/src/hooks/useFeed.ts` | Feed query hook with placeholder data and corrected query key. |
| `apps/web/src/components/layout/BottomNav.tsx` | Preloads Browse route chunk on hover/touch-start. |
| `apps/web/src/pages/Home.tsx` | Explicit loading, error, and empty states. |
| `apps/web/src/service-worker.ts` | Caches `/uploads/*` and `/api/feed*` with size/age caps. |
| `apps/api/src/feed/feed.service.ts` | Longer profile cache TTL + cache-warm helper. |
| `apps/api/src/feed/feed.routes.ts` | Adds `Cache-Control` header to unpersonalized feeds. |
| `apps/web/src/components/layout/MainLayout.tsx` | Offline connectivity indicator. |
| `apps/web/src/hooks/__tests__/useFeed.test.tsx` | Unit test for placeholder-data behavior. |
| `e2e/feed-performance.spec.ts` | Playwright tests for reload/offline behavior. |

---

### Task 1: Persistent Query Cache Dependencies and Provider

**Files:**
- Create: `apps/web/src/lib/queryClient.ts`
- Modify: `apps/web/src/main.tsx:1-31`

**Interfaces:**
- Consumes: none.
- Produces: exported `queryClient` instance used by prefetch hooks and tests.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @tanstack/react-query-persist-client@^5.101.3 idb-keyval@^6.2.0 --filter @silent-review/web
```

Expected output: packages are added to `apps/web/package.json` and `pnpm-lock.yaml`.

- [ ] **Step 2: Create shared query client module**

Create `apps/web/src/lib/queryClient.ts`:

```typescript
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";

const idbStorage = {
  getItem: async (key: string) => get(key),
  setItem: async (key: string, value: string) => set(key, value),
  removeItem: async (key: string) => del(key),
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "silent-review-query-cache",
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
});
```

- [ ] **Step 3: Replace provider in main.tsx**

Modify `apps/web/src/main.tsx` to:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persister } from "./lib/queryClient";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}
```

- [ ] **Step 4: Type-check web project**

```bash
pnpm --filter @silent-review/web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/queryClient.ts apps/web/src/main.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): persist query cache to IndexedDB"
```

---

### Task 2: Prefetch For-You Feed on App Start

**Files:**
- Create: `apps/web/src/hooks/usePrefetchFeed.ts`
- Modify: `apps/web/src/pages/PlayHome.tsx`

**Interfaces:**
- Consumes: `queryClient` from `lib/queryClient`, `useAuthStore` user state.
- Produces: side effect only.

- [ ] **Step 1: Create prefetch hook**

Create `apps/web/src/hooks/usePrefetchFeed.ts`:

```typescript
import { useEffect } from "react";
import { queryClient } from "../lib/queryClient";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import type { FeedResponse } from "./useFeed";

const FEED_LIMIT = 10;

export function usePrefetchFeed() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    // Only prefetch once per session.
    if (queryClient.getQueryData(["feed", "for-you"])) return;

    queryClient
      .prefetchInfiniteQuery({
        queryKey: ["feed", "for-you"],
        queryFn: async ({ pageParam }) => {
          const params = new URLSearchParams();
          if (pageParam) params.set("cursor", String(pageParam));
          params.set("limit", String(FEED_LIMIT));
          const { data } = await api.get<FeedResponse>(`/api/feed?${params.toString()}`);
          return data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 5 * 60 * 1000,
      })
      .catch(() => {});
  }, [user]);
}
```

- [ ] **Step 2: Call prefetch hook from PlayHome**

Add near the top of `apps/web/src/pages/PlayHome.tsx` (inside the component body):

```typescript
import { usePrefetchFeed } from "../hooks/usePrefetchFeed";

export function PlayHome() {
  usePrefetchFeed();
  // ... existing component
}
```

- [ ] **Step 3: Type-check and run dev smoke**

```bash
pnpm --filter @silent-review/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/usePrefetchFeed.ts apps/web/src/pages/PlayHome.tsx
git commit -m "feat(web): prefetch for-you feed after auth"
```

---

### Task 3: Stabilize Feed Tab Switching

**Files:**
- Modify: `apps/web/src/hooks/useFeed.ts:28-49`

**Interfaces:**
- Consumes: none.
- Produces: `useFeed` returns query with `placeholderData` and corrected query key.

- [ ] **Step 1: Add placeholder data and fix query key**

Modify `apps/web/src/hooks/useFeed.ts`:

```typescript
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";
// ... existing interfaces

export function useFeed(feedType: FeedType = "for-you") {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ["feed", feedType],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", String(pageParam));
      params.set("limit", "10");

      let endpoint = "/api/feed";
      if (feedType === "following") endpoint = "/api/feed/following";
      else if (feedType === "trending") endpoint = "/api/feed/trending";

      const { data } = await api.get<FeedResponse>(`${endpoint}?${params.toString()}`);
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

- [ ] **Step 2: Update Home.tsx call site**

In `apps/web/src/pages/Home.tsx:29`, remove the unused category argument:

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } =
  useFeed(activeTab);
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @silent-review/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useFeed.ts apps/web/src/pages/Home.tsx
git commit -m "feat(web): keep previous feed data across tab switches"
```

---

### Task 4: Preload Browse Route from Bottom Navigation

**Files:**
- Modify: `apps/web/src/components/layout/BottomNav.tsx:1-85`

**Interfaces:**
- Consumes: none.
- Produces: side effect only.

- [ ] **Step 1: Add route preload helper**

At the top of `apps/web/src/components/layout/BottomNav.tsx`, add:

```typescript
const preloadBrowse = () => {
  import("../../pages/Home").catch(() => {});
};
```

- [ ] **Step 2: Attach preload events to Browse link**

Find the Browse `NavLink` (the one with `to: "/browse"`) and add:

```tsx
<NavLink
  key={link.to}
  to={link.to}
  onMouseEnter={link.to === "/browse" ? preloadBrowse : undefined}
  onTouchStart={link.to === "/browse" ? preloadBrowse : undefined}
  onClick={(e) => {
    handleNavClick(link.to);
    if (isLinkActive(location.pathname, link.to)) {
      e.preventDefault();
      scrollPageToTop();
    }
  }}
  // ... existing className and children
>
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @silent-review/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/BottomNav.tsx
git commit -m "feat(web): preload Browse route chunk from bottom nav"
```

---

### Task 5: Resilient Browse UI States

**Files:**
- Modify: `apps/web/src/pages/Home.tsx:94-124`

**Interfaces:**
- Consumes: `status`, `reviews`, `refetch` from `useFeed`.
- Produces: rendered loading/error/empty states.

- [ ] **Step 1: Add error and empty UI**

Replace the render block in `apps/web/src/pages/Home.tsx`:

```tsx
const feedBody = (() => {
  if (status === "pending") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <BrandSpinner size="lg" />
        <p className="text-sm font-medium text-white/50">Loading reviews...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-medium text-white/80">We couldn&apos;t load the feed.</p>
        <p className="text-sm text-white/50">Check your connection and try again.</p>
        <button
          onClick={() => refetch()}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20 active:scale-95"
        >
          Retry
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-base font-medium text-white/80">No reviews yet.</p>
        <p className="text-sm text-white/50">Be the first to share one.</p>
      </div>
    );
  }

  return (
    <Feed
      reviews={reviews}
      selectedRatings={selectedRatings}
      onSelectRating={selectRating}
      onReveal={handleReveal}
      revealed={revealed}
      revealData={revealData}
      onLoadMore={() => hasNextPage && fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
      onRefresh={() => refetch()}
      onPlayAgain={handlePlayAgain}
      onScrollDirection={handleScrollDirection}
    />
  );
})();

return (
  <div className="flex h-full flex-col">
    <FeedTabs
      tabs={TABS}
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as FeedType)}
    />
    {feedBody}
  </div>
);
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @silent-review/web typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Home.tsx
git commit -m "feat(web): add explicit feed error and empty states"
```

---

### Task 6: Offline Media and API Caching in Service Worker

**Files:**
- Modify: `apps/web/src/service-worker.ts:1-83`

**Interfaces:**
- Consumes: incoming `fetch` events.
- Produces: cached `Response` objects for `/uploads/*` and `/api/feed*`.

- [ ] **Step 1: Add upload cache with cap**

Replace the fetch handler in `apps/web/src/service-worker.ts`:

```typescript
const UPLOAD_CACHE_NAME = "silent-review-uploads-v1";
const UPLOAD_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const UPLOAD_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

async function trimUploadCache() {
  const cache = await caches.open(UPLOAD_CACHE_NAME);
  const requests = await cache.keys();
  const entries: { request: Request; response: Response; accessed: number }[] = [];
  let totalBytes = 0;

  for (const req of requests) {
    const res = await cache.match(req);
    if (!res) continue;
    const accessed = Number(res.headers.get("x-sw-accessed") || Date.now());
    const size = Number(res.headers.get("content-length") || 0);
    entries.push({ request: req, response: res, accessed });
    totalBytes += size;
  }

  const now = Date.now();
  entries.sort((a, b) => a.accessed - b.accessed);

  for (const entry of entries) {
    if (totalBytes <= UPLOAD_MAX_BYTES && now - entry.accessed < UPLOAD_MAX_AGE_MS) break;
    const size = Number(entry.response.headers.get("content-length") || 0);
    await cache.delete(entry.request);
    totalBytes -= size;
  }
}

async function cacheUpload(request: Request, response: Response) {
  if (request.headers.has("range")) return response;
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!contentLength || contentLength > 10 * 1024 * 1024) return response; // skip files > 10 MB

  const cache = await caches.open(UPLOAD_CACHE_NAME);
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set("x-sw-accessed", String(Date.now()));
  const body = await cloned.blob();
  await cache.put(request, new Response(body, { status: cloned.status, statusText: cloned.statusText, headers }));
  trimUploadCache().catch(() => {});
  return response;
}

async function handleUploadFetch(request: Request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const network = await fetch(request);
    if (network.ok) {
      return cacheUpload(request, network);
    }
    return network;
  } catch {
    return caches.match(request) as Promise<Response>;
  }
}

async function handleFeedFetch(request: Request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  try {
    const network = await fetch(request);
    if (network.ok) {
      const clone = network.clone();
      cache.put(request, clone).catch(() => {});
    }
    return network;
  } catch {
    return cached ?? Response.json({ reviews: [], nextCursor: undefined }, { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(handleUploadFetch(request));
    return;
  }

  if (url.pathname.startsWith("/api/feed")) {
    event.respondWith(handleFeedFetch(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html") as Promise<Response>)
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
```

- [ ] **Step 2: Type-check**

The service worker is not type-checked by `tsc` by default, but ensure Vite build passes:

```bash
pnpm --filter @silent-review/web build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/service-worker.ts
git commit -m "feat(web): cache uploads and feed API in service worker"
```

---

### Task 7: Server-Side Cache Tuning

**Files:**
- Modify: `apps/api/src/feed/feed.service.ts:1-321`
- Modify: `apps/api/src/feed/feed.routes.ts`
- Modify: mutation services that affect profile (find and warm cache).

**Interfaces:**
- Consumes: Redis client from `getRedis()`.
- Produces: warmer `user:profile:*` cache and `Cache-Control` headers.

- [ ] **Step 1: Increase profile cache TTL and expose warm helper**

In `apps/api/src/feed/feed.service.ts`, change:

```typescript
const PROFILE_CACHE_TTL_SECONDS = 60 * 60; // was 15 * 60
```

Add export at the bottom of the file:

```typescript
export async function warmUserProfileCache(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const profile = await buildUserProfile(userId);
  const payload = JSON.stringify({
    followingIds: Array.from(profile.followingIds),
    interestCategories: Array.from(profile.interestCategories.entries()),
    seenReviewIds: Array.from(profile.seenReviewIds),
  });
  await redis.setex(`user:profile:${userId}`, PROFILE_CACHE_TTL_SECONDS, payload).catch(() => {});
}
```

- [ ] **Step 2: Add Cache-Control to feed routes**

In `apps/api/src/feed/feed.routes.ts`, add `Cache-Control: private, max-age=300` to feed endpoints. Example pattern:

```typescript
res.setHeader("Cache-Control", "private, max-age=300");
res.json(result);
```

Apply to `GET /api/feed`, `/api/feed/following`, `/api/feed/trending`, and `/api/feed/category/:category`.

- [ ] **Step 3: Warm profile cache on guess/like/follow/review**

Find the mutation handlers (guess submission, like toggle, follow toggle, review creation) and call:

```typescript
import { warmUserProfileCache } from "../feed/feed.service.js";

// after successful mutation for authenticated user
await warmUserProfileCache(userId);
```

At minimum, add this to:
- `apps/api/src/guesses/guess.routes.ts` after guess submission.
- `apps/api/src/social/social.routes.ts` after follow/like mutations.
- `apps/api/src/reviews/reviews.routes.ts` after review creation.

- [ ] **Step 4: Type-check API**

```bash
pnpm --filter @silent-review/api typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/feed/feed.service.ts apps/api/src/feed/feed.routes.ts apps/api/src/guesses/guess.routes.ts apps/api/src/social/social.routes.ts apps/api/src/reviews/reviews.routes.ts
git commit -m "feat(api): extend feed cache TTL and warm profile cache"
```

---

### Task 8: Offline Connectivity Indicator

**Files:**
- Modify: `apps/web/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `navigator.onLine` state.
- Produces: small offline banner rendered above children.

- [ ] **Step 1: Add offline state hook**

Create `apps/web/src/hooks/useOnlineStatus.ts`:

```typescript
import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
```

- [ ] **Step 2: Render offline banner in MainLayout**

In `apps/web/src/components/layout/MainLayout.tsx`, add:

```typescript
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function MainLayout() {
  const online = useOnlineStatus();
  // ... existing layout

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {!online && (
        <div className="bg-amber-500 px-4 py-1 text-center text-xs font-semibold text-black">
          Offline — showing saved content
        </div>
      )}
      {/* existing layout children */}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @silent-review/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useOnlineStatus.ts apps/web/src/components/layout/MainLayout.tsx
git commit -m "feat(web): show offline connectivity indicator"
```

---

### Task 9: Unit Test for useFeed Placeholder Data

**Files:**
- Create: `apps/web/src/hooks/__tests__/useFeed.test.tsx`

**Interfaces:**
- Consumes: `useFeed` hook.
- Produces: passing test asserting `placeholderData` behavior.

- [ ] **Step 1: Write test**

Create `apps/web/src/hooks/__tests__/useFeed.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFeed } from "../useFeed";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  api: { get: vi.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useFeed", () => {
  it("keeps previous data when switching tabs", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { reviews: [{ id: "r1" }] } })
      .mockResolvedValueOnce({ data: { reviews: [{ id: "r2" }] } });

    const { result, rerender } = renderHook(({ tab }: { tab: "for-you" | "trending" }) => useFeed(tab), {
      wrapper,
      initialProps: { tab: "for-you" },
    });

    await waitFor(() => expect(result.current.data?.pages[0].reviews).toHaveLength(1));
    rerender({ tab: "trending" });

    expect(result.current.data?.pages[0].reviews[0].id).toBe("r1");
    await waitFor(() => expect(result.current.data?.pages[0].reviews[0].id).toBe("r2"));
  });
});
```

- [ ] **Step 2: Run test**

```bash
pnpm --filter @silent-review/web test -- apps/web/src/hooks/__tests__/useFeed.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/__tests__/useFeed.test.tsx
git commit -m "test(web): useFeed placeholder data across tabs"
```

---

### Task 10: E2E Tests for Feed Performance and Offline

**Files:**
- Create: `e2e/feed-performance.spec.ts`

**Interfaces:**
- Consumes: running dev server and seeded database.
- Produces: passing E2E assertions.

- [ ] **Step 1: Write E2E spec**

Create `e2e/feed-performance.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers/auth";

test.describe("feed performance", () => {
  test("feed renders from cache within 1 second after reload", async ({ page }) => {
    await loginUser(page, "serge", "password");
    await page.goto("/browse");
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 1000 });
  });

  test("previously loaded feed items remain visible offline", async ({ page, context }) => {
    await loginUser(page, "serge", "password");
    await page.goto("/browse");
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 10000 });

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 3000 });
  });
});
```

- [ ] **Step 2: Add data-testid to feed items**

In `apps/web/src/components/feed/Feed.tsx`, ensure each feed item wrapper has `data-testid="feed-item"`. If it already uses a different test id, update the E2E spec to match.

- [ ] **Step 3: Run E2E tests**

```bash
pnpm test:e2e --project="Mobile Chrome" e2e/feed-performance.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/feed-performance.spec.ts apps/web/src/components/feed/Feed.tsx
git commit -m "test(e2e): feed cache and offline resilience"
```

---

## Self-Review

- **Spec coverage:**
  - Prefetch for-you feed → Task 2.
  - Persist TanStack Query cache → Task 1.
  - Placeholder data across tabs → Task 3.
  - Preload Browse route → Task 4.
  - Service worker upload/API cache → Task 6.
  - Server-side Redis TTL + warm → Task 7.
  - Error/empty UI states → Task 5.
  - Offline indicator → Task 8.
  - Tests → Tasks 9 and 10.
- **Placeholder scan:** all steps include concrete code/commands; no "TBD" or "implement later".
- **Type consistency:** `useFeed` query key is `["feed", feedType]` consistently; `FeedResponse` type is reused across prefetch hook and `useFeed`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-feed-performance-offline-plan.md`.

Auto permission mode is active, so I will proceed with **Subagent-Driven** execution using `superpowers:subagent-driven-development`.
