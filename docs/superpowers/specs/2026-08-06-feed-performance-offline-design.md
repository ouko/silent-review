# Feed Performance and Offline Caching Design

## Objective
Make content load quickly and reliably in the Silent Review web app, and add offline fallback so returning users do not start from a blank screen.

## Context
- The for-you feed builds a per-user profile from up to 4 Prisma queries and scores 200 candidates; the Redis profile cache TTL is only 15 minutes.
- TanStack Query is configured with a 2-minute default stale time and no persistence; the feed cache lives only in memory and is lost on reload.
- The Browse route (`Home.tsx`) is lazy-loaded, so its chunk must download before the feed can fetch.
- Switching between For You / Following / Trending creates a new query key with no placeholder data.
- The service worker explicitly skips `/api/` and `/uploads/`, so neither feed responses nor media are cached for offline use.
- `Home.tsx` silently renders an empty feed on error, which can look like a blank screen.

## Approach
A targeted, low-risk set of changes (Approach A):
1. Prefetch the for-you feed as soon as the user is authenticated.
2. Persist the TanStack Query cache to IndexedDB for feed, daily drop, and challenge keys.
3. Keep previous feed data as placeholder data when switching tabs.
4. Preload the Browse route chunk from the bottom navigation.
5. Extend the service worker to cache upload thumbnails and short API responses with sensible size/age caps.
6. Extend server-side Redis TTLs and warm the profile cache after relevant mutations.
7. Add explicit loading, error, and empty states to the Browse feed UI.

## Implementation Details

### Client prefetch
- In `apps/web/src/main.tsx`, after auth bootstraps, call `queryClient.prefetchInfiniteQuery({ queryKey: ["feed", "for-you", undefined], ... })`.
- In `apps/web/src/components/layout/BottomNav.tsx`, prefetch the `Home` route chunk on hover / touch-start.

### Persistent query cache
- Add `@tanstack/react-query-persist-client` and `idb-keyval`.
- Replace `QueryClientProvider` with `PersistQueryClientProvider` in `main.tsx`.
- Persist only query keys matching `feed.*`, `dailyDrop*`, and `challenges.*`; max age 24 hours; exclude auth/user/account keys.
- On startup, stale persisted data renders immediately while fresh data revalidates in the background.

### Tab-switch placeholder data
- Update `apps/web/src/hooks/useFeed.ts` to set `placeholderData: (previousData) => previousData`.
- Fix the unused `category` query-key segment: either pass it to the API or remove it from the key.

### Service worker offline cache
- In `apps/web/src/service-worker.ts`, add a cache route for `/uploads/*` (non-range GETs) with a 200 MB / 7-day cap.
- Add a network-first route for `/api/feed*` with a short (5-minute) cache fallback.
- Keep navigation network-first and static assets cache-first.

### Server-side cache tuning
- Increase `PROFILE_CACHE_TTL_SECONDS` in `apps/api/src/feed/feed.service.ts` from 15 minutes to 60 minutes.
- Warm the profile cache in the background after follow/like/guess/review mutations.
- Add `Cache-Control: private, max-age=300` to unpersonalized feed responses.

### UI resilience
- In `apps/web/src/pages/Home.tsx`, render explicit loading, error retry, and empty states instead of silently passing an empty array to `Feed`.
- Add a small offline badge in `MainLayout.tsx` when `navigator.onLine === false`.

### Testing
- Playwright: reload the app, open Browse, and assert feed items render from cache within 1 second.
- Playwright: disconnect network, open Browse, and assert previously loaded items are visible.
- Unit test for `useFeed` placeholder-data behavior.

## Commands
- Install client persistence deps: `pnpm add @tanstack/react-query-persist-client idb-keyval --filter web`
- Dev: `pnpm dev` (restarts both servers)
- Type-check: `pnpm --filter web typecheck && pnpm --filter api typecheck`
- E2E: `pnpm test:e2e --project="Mobile Chrome" e2e/feed-performance.spec.ts`

## Success Criteria
- First Browse open after app launch shows content within 1.5 seconds on a warm cache.
- Reloading the app and opening Browse shows previously loaded feed items immediately, then refreshes in the background.
- Switching feed tabs does not show a blank screen; the previous tab's data remains visible until the new tab loads.
- With the network disconnected, previously viewed feed items and their thumbnails remain visible.
- No PII or auth tokens are persisted to IndexedDB.

## Out of Scope
- Full offline video playback of unseen content.
- Background sync for offline actions (likes, guesses, comments).
- Rewriting the feed scoring algorithm.
- Changes to the guessing, challenge, or monetization flows beyond caching/prefetch.
