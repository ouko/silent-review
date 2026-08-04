# Game-First Home Redesign

## Overview
Replace the review feed as the default landing screen with a game-first home. The existing feed becomes a secondary "Browse" tab. The first thing every user sees after opening the app is the game: today's Daily Drop, pending challenges, streak status, and a continue-playing strip.

## Success Criteria
1. First open after update lands on `/play`; the video feed lives at `/browse`.
2. A new user can start their first round within 2 taps of app open.
3. Pending challenges and streak status are visible above the fold on a 375px viewport.
4. Old feed route remains fully functional for deep links (`/review/:id`, `/s/:id`).

## Defaults Chosen (auto mode)
- **Activity tab:** lightweight placeholder (`/activity`) with a "Coming soon" state. No backend notifications system is introduced in this change.
- **Daily Drop:** sourced from the existing `/api/feed` endpoint. The first unplayed review is treated as today's Daily Drop; subsequent feed items populate the "Continue playing" strip. Played/unplayed state is tracked locally per user/session.

## Architecture

### New Components
| Component | File | Responsibility |
|-----------|------|----------------|
| `PlayHome` | `apps/web/src/pages/PlayHome.tsx` | Composes the game home sections, owns data fetching via `useFeed` and `useGamification`. |
| `DailyDropCard` | `apps/web/src/components/play/DailyDropCard.tsx` | Shows today's review thumbnail, CTA, and played/unplayed badge. Navigates to `/review/:id` on tap. |
| `ChallengeInbox` | `apps/web/src/components/play/ChallengeInbox.tsx` | Lists pending challenge invites with sender avatar, accept/decline actions. Uses existing `useChallenges`. |
| `StreakHeader` | `apps/web/src/components/play/StreakHeader.tsx` | Displays current streak, freeze status, and points. Consumes `useGamification`. |
| `ContinuePlaying` | `apps/web/src/components/play/ContinuePlaying.tsx` | Horizontal strip of next unplayed rounds. Tapping an item navigates to the review. |
| `Activity` | `apps/web/src/pages/Activity.tsx` | Placeholder page for the new Activity tab. |

### State Management
- `playStore.ts` (Zustand) holds lightweight client state:
  - `dailyDropReviewId: string | null`
  - `playedReviewIds: Set<string>`
  - `pendingChallengeCount: number`
  - Actions: `markPlayed(reviewId)`, `setDailyDrop(reviewId)`, `setPendingChallengeCount(n)`
- The store is hydrated from `useFeed`/`useChallenges` and persists played IDs to `localStorage` per user.

### Routing
```
/           -> redirect to /play (preserve legacy behavior)
/play       -> PlayHome (eagerly loaded)
/browse     -> Home (existing feed, lazy loaded)
/record     -> Record (lazy)
/activity   -> Activity (lazy)
/profile/:id-> Profile (lazy)
/review/:id -> ReviewDetail (existing deep-link support)
/s/:id      -> short-link redirect to /review/:id
```

### Navigation (BottomNav)
Reorder tabs: Play, Browse, Create, Activity, Profile.
- Keep the existing `BottomNav` component, only change the `LINKS` array.
- Active-state logic remains; `/profile/me` still matches `/profile/*`.
- Tapping an active tab scrolls to top (existing behavior).

### Analytics
Instrument via existing `trackEvent` in `apps/web/src/lib/analytics.ts`:
- `tab_switched` when user taps a bottom-nav item (properties: `to`, `from`).
- `first_round_start_time` computed in `PlayHome`: time from `app_open` to first Daily Drop / Continue Playing tap; emitted once per session.
- Re-use existing `first_round_complete`, `daily_drop_played`, `challenge_accepted`, `guess_submitted` events inside the play flow.

### Lazy Loading
- Only `PlayHome` is eagerly loaded.
- `Browse`, `Record`, `Activity`, `Profile`, and all other pages remain `React.lazy`.

### Styling
- Use existing Tailwind tokens: `bg-black`, `text-white`, `rounded-2xl/3xl`, `border-white/10`, `bg-white/5`, gradient backgrounds (`from-rose-500 via-pink-500 to-violet-500`), glassmorphism (`backdrop-blur-xl`).
- Layout must keep StreakHeader + DailyDropCard + ChallengeInbox visible without scrolling on 375px height (iPhone SE class) by making ContinuePlaying the scrollable lower section or collapsing empty states.

## Data Flow
1. `MainLayout` mounts, analytics initialized, `app_open` tracked.
2. `PlayHome` mounts and concurrently fetches:
   - `useFeed("for-you")` for Daily Drop + Continue Playing candidates.
   - `useGamification` for streak/points.
   - `useChallenges` for pending challenges.
3. `playStore` is updated with the first unplayed review ID and pending challenge count.
4. User taps Daily Drop card → navigates to `/review/:id` with `from=play_home` query param.
5. On reveal completion, `markPlayed(reviewId)` is called in the store and persisted.
6. Returning to `/play` re-evaluates; the next unplayed item becomes the Daily Drop.

## Error Handling
- If feed fails, show inline error card in DailyDropCard with retry.
- If gamification fails, StreakHeader falls back to cached values or hides points.
- If challenges fail, ChallengeInbox shows empty state.

## Testing
- Playwright spec `e2e/play-home.spec.ts`:
  - New (registered) user lands on `/play`.
  - Daily Drop card is visible.
  - Tapping the card navigates to a review.
  - Assert ≤ 2 taps from app open to first round start.

## Scope Exclusions
- No new backend endpoints. Daily Drop is derived from existing feed.
- No real-time notifications backend. Activity tab is a placeholder.
- No changes to feed internals, review detail, or guess/reveal logic.

## Migration Notes
- Existing `/` route redirect preserves any bookmarks or hard-coded links.
- `BottomNav` order change is purely client-side.
