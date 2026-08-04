# Game Home Redesign — Design Spec

**Date:** 2026-08-04  
**Scope:** MVP repositioning of the `/` route from a scrollable review feed to a focused, single-review guessing game. The existing feed is preserved at `/feed`.

## Product Context

SilentReview is repositioning from a review platform to a retention-first social guessing game. The review content is the engine; the game is the face.

> *"Watch a video where people secretly review stuff, guess what rating they gave it, and beat your friends to prove you know what's actually good."*

Currently, opening `/` lands the user on the `Home` feed (`Home.tsx`) with `For You / Following / Trending` tabs and an infinitely scrollable list of review cards. This redesign makes `/` a game screen where the user immediately plays one review at a time.

## Goals

1. Make the first action after login **playing the game**, not browsing a feed.
2. Reuse the existing 10-point guess, reveal, scoring, and share systems.
3. Keep the feed accessible for users who want to browse.
4. Ship behind the existing feature-flag system so the rollout is reversible.

## Non-Goals

- Swipe-based vertical stack (TikTok-style) for this MVP.
- New backend models or daily-match sessions.
- Monetization hooks (rewarded ads, battle pass) — those come after the game home is live.
- Replacing the bottom navigation.

## User Flow

1. User logs in and is redirected to `/`.
2. A single review autoplays in a full-viewport player.
3. Overlay text: **"Guess the rating"** with the existing 1–10 `RatingBar`.
4. User taps a rating, then taps **"Reveal rating"**.
5. The existing `RevealScreen` slides in, showing:
   - Actual rating
   - Points earned (10/5/2/0)
   - Total guesses and distribution
   - Share / Play again / Next actions
6. Tapping **"Next"** loads another review.
7. Liking, commenting, and sharing remain available via the existing action row.
8. A top-bar link opens `/feed` for users who want the old browse experience.

## Architecture

### Routing Changes

| Route | Current | New |
|---|---|---|
| `/` | `Home` (feed) | `GameHome` |
| `/feed` | — | `Home` (existing feed) |
| `/review/:id` | Review detail | Unchanged |
| `/record`, `/viral`, `/profile/me` | Unchanged | Unchanged |

The bottom nav "Home" item continues to point to `/`.

### Components

- **`pages/GameHome.tsx`** (new)  
  Container for the single-review game screen. Manages game state (`currentReview`, `selectedRating`, `revealed`, `revealData`) and fetches the next review via `useGameReview`.

- **`components/game/GameCard.tsx`** (new)  
  Full-viewport card for one review. Composes:
  - `VideoPlayer` (existing)
  - `VideoInfo` (existing)
  - `LikeButton`, comment link, share button (existing action row)
  - `FeedGuessOverlay` logic extracted/reused for the rating bar + reveal button
  - `RevealScreen` (existing)

- **`hooks/useGameReview.ts`** (new)  
  TanStack Query hook wrapping `GET /api/game/next`. Refetches when the user requests the next card.

- **`components/feed/Feed.tsx`** — unchanged; moved to `/feed`.
- **`pages/Home.tsx`** — unchanged; becomes the `/feed` page.

### Backend Changes

- **`GET /api/game/next`** (new route in `apps/api/src/feed/feed.routes.ts` or new `apps/api/src/game/game.routes.ts`)  
  Returns one review for the authenticated user to play.

  Behavior:
  1. Query for a `PUBLISHED`, non-deleted review the user has **not** guessed, using the same scoring/diversity logic as `getForYouFeed` but limited to one result.
  2. If no unguessed review exists, return a random already-guessed review with an `alreadyGuessed: true` hint so the UI can show a "Play again" state.
  3. No Redis caching, so a fresh review is returned immediately after each guess.

  Response shape matches `FeedReview` from the existing feed.

- **Cache invalidation** — existing guess endpoint should clear `feed:fyp:*` Redis keys for the user so the old feed also stays fresh.

### Feature Flag

- Add `gameHome` to the `FeatureFlag` table (seed + migration if required).
- Wrap the route switch in a runtime check:
  - If `gameHome` is enabled: `/` → `GameHome`, `/feed` → old `Home`.
  - If disabled: `/` → old `Home` (current behavior), `/feed` can 404 or redirect to `/`.
- Because `react-router` routes are static, the flag will be read at app bootstrap; a page reload is required to toggle. Alternatively, the `GameHome` component can render the old `Home` as its own fallback when the flag is off.

## Data Flow

```
User opens /
  -> GameHome mounts
  -> useGameReview fetches /api/game/next
  -> GameCard renders VideoPlayer + overlay
  -> User selects rating
  -> GameHome calls POST /api/guesses/:id + GET /api/guesses/:id/reveal
  -> RevealScreen shown with score
  -> User taps Next
  -> useGameReview refetches /api/game/next
  -> New GameCard animates in
```

## Error Handling

- Empty database / no reviews: show friendly empty state with a CTA to create a review (`/record`).
- Guess submission failure: show existing toast via `useUIStore`.
- Video load failure: reuse `VideoPlayer` error state; allow "Next" to skip.

## Testing

- **Unit:** `useGameReview` hook test with MSW.
- **E2E (Playwright):**
  - New user lands on `/`, sees a review, guesses, reveals, taps Next, sees another review.
  - `/feed` still renders the old scrollable feed.
  - Feature flag off restores old `/` behavior.

## Open Questions / Future Work

1. Should `/` remember the last played review across reloads, or always fetch fresh? (Start fresh; add persistence if users complain.)
2. Should the daily streak be explicitly surfaced on this screen? (Yes, likely in the top bar, but out of MVP scope.)
3. Swipe-to-advance and preloaded stack for v2.
4. Battle-pass / rewarded-ad integration points: add placeholder hooks in `GameHome` state machine for future rewarded lives or double-points bonuses.

## Success Criteria

- `/` shows a single playable review within 2 seconds on a 4G connection.
- A user can guess, reveal, and move to the next review without scrolling.
- `/feed` remains reachable and functional.
- All existing E2E smoke tests pass, plus a new game-home happy-path test.
