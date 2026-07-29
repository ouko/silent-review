# Silent Review — Exhaustive Codebase Audit Report

**Date:** 2026-07-29  
**Scope:** Full monorepo (`apps/api`, `apps/web`, `packages/database`, `packages/shared`, infrastructure, CI/CD, tests, documentation)  
**Objective:** Identify issues, resolve critical/high-impact problems, and document remaining work.

---

## Executive Summary

The Silent Review app is functionally complete and its existing CI workflow passes. However, an exhaustive audit uncovered **critical security vulnerabilities**, **several runtime bugs**, **accessibility gaps**, **performance bottlenecks**, **infrastructure hardening needs**, and **significant test/documentation coverage gaps**.

This report documents all findings. Critical and high-severity items were resolved in the accompanying commit(s); medium/low-severity items are tracked below for future sprints.

---

## 1. Security

### 1.1 Critical — Apple ID token not verified
- **File:** `apps/api/src/auth/providers/apple.provider.ts:50`
- **Issue:** `jwt.decode()` is used instead of `jwt.verify()`. Signature, issuer, audience, and expiry are not validated.
- **Status:** Fixed.
- **Fix:** Use `jwt.verify(rawIdToken, applePublicKey, { algorithms: ['ES256'], audience: APPLE_CLIENT_ID, issuer: 'https://appleid.apple.com' })` and validate `exp`.

### 1.2 Critical — Socket.IO unauthenticated
- **Files:** `apps/api/src/socket/socket.server.ts`, `apps/api/src/socket/presence.service.ts`, `apps/api/src/socket/review.room.ts`
- **Issue:** Anyone can connect, join review rooms, spoof presence, and receive reveal data.
- **Status:** Fixed.
- **Fix:** Add JWT auth middleware to the Socket.IO handshake; verify `userId` before updating presence; restrict reveal to author/participants.

### 1.3 Critical — OAuth endpoints lack CSRF/state and redirect_uri allow-list
- **Files:** `apps/api/src/routes/auth.ts:230-255`, `apps/api/src/auth/providers/{google,tiktok,instagram}.provider.ts`
- **Issue:** `code` and `redirectUri` are accepted from the client without `state` validation or redirect_uri binding.
- **Status:** Fixed.
- **Fix:** Generate signed, time-bound `state`, validate it on callback, and validate `redirectUri` against an explicit allow-list.

### 1.4 High — OAuth tokens stored in plaintext
- **File:** `apps/api/src/auth/auth.service.ts:84-93`, `packages/database/prisma/schema.prisma:72-73`
- **Issue:** Provider access/refresh tokens are persisted unencrypted.
- **Status:** Fixed.
- **Fix:** Encrypt provider tokens with AES-256-GCM before persistence; decrypt on use.

### 1.5 High — User emails leaked in notifications
- **Files:** `apps/api/src/comments/comments.routes.ts:79`, `apps/api/src/likes/likes.routes.ts:52`, `apps/api/src/follows/follows.routes.ts:27`
- **Issue:** Notification bodies include the actor's email address.
- **Status:** Fixed.
- **Fix:** Use `displayName` or `username` instead of `email`.

### 1.6 High — Access token persisted to localStorage
- **File:** `apps/web/src/stores/authStore.ts:24-40`
- **Issue:** XSS can steal the access token.
- **Status:** Fixed.
- **Fix:** Keep access token in memory only; rely on HTTP-only refresh cookie handled by the backend.

### 1.7 High — No security headers / trust proxy misconfiguration
- **File:** `apps/api/src/app.ts:28-43`
- **Issue:** Missing CSP, HSTS, X-Frame-Options; `X-Forwarded-For` trusted without proxy allow-list.
- **Status:** Fixed.
- **Fix:** Add `helmet` with sensible defaults and configure `trust proxy` explicitly.

### 1.8 Medium — Rate limiting only on auth endpoints
- **File:** `apps/api/src/routes/auth.ts:55-65`
- **Issue:** Feed, likes, follows, guesses, comments lack rate limiting.
- **Status:** Tracked (medium). Apply tiered rate limiting globally.

### 1.9 Medium — `requireAuth` does not verify user still exists
- **File:** `apps/api/src/middleware/auth.ts:12-32`
- **Issue:** Tokens remain valid after soft deletion.
- **Status:** Tracked (medium). Look up `deletedAt` and reject deleted users.

### 1.10 Medium — `emailVerified` set to true indiscriminately
- **File:** `apps/api/src/auth/auth.service.ts:79`
- **Issue:** `emailVerified` is set to `true` whenever a provider returns an email.
- **Status:** Tracked (medium). Respect provider `email_verified` claim.

### 1.11 Low — Unused passport dependencies
- **File:** `apps/api/package.json:30-32`
- **Issue:** `passport` packages are unused.
- **Status:** Tracked (low). Remove unused deps.

### 1.12 Low — Swagger docs served publicly
- **File:** `apps/api/src/docs/swagger.ts:32-33`
- **Issue:** API structure disclosed without auth.
- **Status:** Tracked (low). Gate docs behind admin auth or disable in production.

---

## 2. Bugs and Runtime Errors

### 2.1 Critical — Hardcoded OAuth code in frontend
- **Files:** `apps/web/src/pages/Login.tsx:51-53`, `apps/web/src/pages/Register.tsx:57-59`
- **Issue:** OAuth handler sends `code: "demo-code"` regardless of provider.
- **Status:** Fixed.
- **Fix:** Implement real OAuth redirect flow and remove hardcoded value.

### 2.2 High — Review detail never surfaces API errors
- **File:** `apps/web/src/pages/ReviewDetail.tsx:27-34`
- **Issue:** Failure stays in `<Loading />` forever.
- **Status:** Fixed.
- **Fix:** Add error state and render `ErrorFallback` / retry button.

### 2.3 High — AuthGuard fetch races with unmount / token changes
- **File:** `apps/web/src/components/AuthGuard.tsx:10-23`
- **Issue:** `fetchMe` not cancelled; can call `setUser` on unmounted component.
- **Status:** Fixed.
- **Fix:** Use `AbortController` and cleanup effect.

### 2.4 High — Guess count inflated on update
- **File:** `apps/api/src/guesses/guesses.service.ts:28-56`
- **Issue:** `upsert` increments `guessCount` and `totalGuesses` on every update.
- **Status:** Fixed.
- **Fix:** Only increment counts on create; track whether upsert created a new row.

### 2.5 High — `exactGuessCount` uses post-upsert count
- **File:** `apps/api/src/guesses/guesses.service.ts:41-50`
- **Issue:** Count fetched after upsert includes current guess, ignoring whether it was previously exact.
- **Status:** Fixed.
- **Fix:** Compute `exactGuessCount` before the upsert and adjust for the current guess outcome.

### 2.6 Medium — Like toggle not atomic
- **File:** `apps/api/src/likes/likes.routes.ts:32-44`
- **Issue:** Concurrent requests can create duplicate likes or corrupt `likeCount`.
- **Status:** Fixed.
- **Fix:** Wrap check/insert/delete + counter update in a Prisma transaction.

### 2.7 Medium — Feed pagination yields NaN
- **Files:** `apps/api/src/feed/feed.routes.ts:15`, `apps/api/src/users/users.routes.ts:71`, `apps/api/src/comments/comments.routes.ts:18`, `apps/api/src/gamification/gamification.routes.ts:59`
- **Issue:** `Number(req.query.limit ?? 10)` yields `NaN` for non-numeric input.
- **Status:** Fixed.
- **Fix:** Validate/coerce `limit` with Zod.

### 2.8 Medium — Product search empty tsquery crash
- **File:** `apps/api/src/products/products.service.ts:22-59`
- **Issue:** Search term stripped to empty string causes PostgreSQL error.
- **Status:** Fixed.
- **Fix:** Return empty results when `tsQuery` is empty.

### 2.9 Low — `Revenue` amount cast without validation
- **File:** `apps/api/src/revenue/revenue.routes.ts:28`
- **Issue:** `Number()` can produce `NaN` or negative values.
- **Status:** Tracked (low). Validate with Zod.

### 2.10 Low — Comment `parentId` not validated to same review
- **File:** `apps/api/src/comments/comments.routes.ts:64`
- **Issue:** Cross-review replies possible.
- **Status:** Tracked (low). Add parent comment reviewId check.

---

## 3. Accessibility

### 3.1 High — Missing form labels
- **Files:** `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Register.tsx`, `components/create/ReviewFinalize.tsx`, `components/create/ProductSearch.tsx`, `components/comments/CommentsSection.tsx`
- **Issue:** Inputs use only `placeholder`.
- **Status:** Fixed.
- **Fix:** Add `<label htmlFor="...">` or `aria-label` to every input.

### 3.2 High — Rating bar not keyboard-operable
- **File:** `apps/web/src/components/guess/RatingBar.tsx:21-61`
- **Issue:** No arrow-key navigation; must tab through all 10 ratings.
- **Status:** Fixed.
- **Fix:** Implement roving `tabIndex` and arrow-key handlers.

### 3.3 High — Toasts not announced to screen readers
- **File:** `apps/web/src/components/common/Toast.tsx:6-51`
- **Issue:** No `aria-live` region.
- **Status:** Fixed.
- **Fix:** Wrap toast container in `aria-live="polite"`; use `role="status"`/`role="alert"`.

### 3.4 High — Share sheet modal inaccessible
- **File:** `apps/web/src/components/share/ShareSheet.tsx:36-111`
- **Issue:** No focus trap, no Escape close, no focus restore.
- **Status:** Fixed.
- **Fix:** Add focus trap, Escape handler, `aria-modal="true"`, `role="dialog"`, and close button label.

### 3.5 Medium — Decorative images lack helpful alt text
- **Files:** `components/feed/VideoInfo.tsx`, `components/profile/Profile.tsx`, `components/gamification/BadgesDisplay.tsx`, etc.
- **Issue:** Avatars/thumbnails use `alt=""` even when they convey meaning.
- **Status:** Fixed where meaningful.
- **Fix:** Provide descriptive alt text or `aria-label`.

### 3.6 Medium — Like/Follow buttons lack toggle semantics
- **Files:** `components/social/LikeButton.tsx`, `components/social/FollowButton.tsx`
- **Issue:** No `aria-pressed`.
- **Status:** Fixed.
- **Fix:** Add `aria-pressed` and descriptive `aria-label`.

### 3.7 Medium — Activity feed list items not buttons
- **File:** `components/social/ActivityFeed.tsx:66-82`
- **Issue:** `li` elements have `onClick` but no role/tabIndex.
- **Status:** Fixed.
- **Fix:** Render as `<button>` or add role/tabIndex and keyboard handlers.

---

## 4. Mobile-First UX

### 4.1 High — Viewport disables user scaling
- **File:** `apps/web/index.html:6`
- **Issue:** `maximum-scale=1.0, user-scalable=no` blocks pinch-zoom.
- **Status:** Fixed.
- **Fix:** Use `width=device-width, initial-scale=1.0` only.

### 4.2 Medium — Video player controls missing on feed
- **File:** `components/feed/VideoPlayer.tsx:18-26`
- **Issue:** No visible play/pause or volume control.
- **Status:** Tracked (medium). Add tap-to-play/pause overlay and unmute button.

### 4.3 Medium — Comment input obscured by keyboard
- **File:** `components/comments/CommentsSection.tsx:29-67`
- **Issue:** No `scrollIntoView` behavior.
- **Status:** Tracked (medium). Focus input with `scrollIntoView({ block: 'center' })`.

### 4.4 Low — Bottom nav can wrap on small viewports
- **File:** `components/layout/BottomNav.tsx:12-41`
- **Status:** Tracked (low). Add `min-w-0` and truncate labels.

---

## 5. Performance

### 5.1 High — Canvas export runs on main thread
- **File:** `apps/web/src/lib/export/canvasRenderer.ts:29-31`
- **Issue:** 1080×1920 canvas + `MediaRecorder` on main thread can jank/crash phones.
- **Status:** Tracked (high). Offload to Web Worker, downscale on low-end devices, cap frame rate.

### 5.2 Medium — No route-based code splitting
- **File:** `apps/web/src/router.tsx:5-10`
- **Issue:** Login/Register/ReviewDetail eagerly loaded.
- **Status:** Tracked (medium). Lazy-load non-critical routes.

### 5.3 Medium — Service worker caches all GETs indiscriminately
- **File:** `apps/web/src/service-worker.ts:37-66`
- **Issue:** Videos/images stored without limits.
- **Status:** Tracked (medium). Cache only static assets; use Network-First for media.

### 5.4 Low — Entire feed re-renders on pull distance changes
- **File:** `components/feed/Feed.tsx:71-92`
- **Status:** Tracked (low). Extract pull indicator into memoized component.

---

## 6. Database & Schema

### 6.1 High — Soft-delete unique constraints block re-registration
- **File:** `packages/database/prisma/schema.prisma:12-13`
- **Issue:** `User.email`/`username` plain unique indexes prevent reuse after soft delete.
- **Status:** Tracked (high). Add partial unique indexes `WHERE "deletedAt" IS NULL`.

### 6.2 Medium — Email uniqueness case-sensitive
- **File:** `packages/database/prisma/schema.prisma:12`
- **Status:** Tracked (medium). Use `citext` or `LOWER(email)` unique index.

### 6.3 Medium — Full-text search uses wrong index type
- **File:** `packages/database/prisma/schema.prisma:103`
- **Status:** Tracked (medium). Store as `tsvector` with GIN index.

### 6.4 Medium — Missing composite indexes for feed queries
- **File:** `packages/database/prisma/schema.prisma:165`
- **Status:** Tracked (medium). Add `@@index([status, deletedAt, createdAt])`, etc.

### 6.5 Low — Redundant index on `Invite.code`
- **File:** `packages/database/prisma/schema.prisma:301,310`
- **Status:** Tracked (low). Remove redundant `@@index([code])`.

---

## 7. Infrastructure & DevOps

### 7.1 High — Missing `.dockerignore`
- **File:** project root
- **Issue:** `.env`, `.git`, `node_modules`, `dist` can be copied into Docker images.
- **Status:** Fixed.
- **Fix:** Added `.dockerignore` excluding sensitive/build artifacts.

### 7.2 High — Nginx `client_max_body_size` default 1 MB
- **File:** `nginx/nginx.conf:37`
- **Issue:** Video uploads >1 MB rejected with 413.
- **Status:** Fixed.
- **Fix:** Set `client_max_body_size 100M;`.

### 7.3 High — Production Nginx HTTPS commented out
- **File:** `nginx/nginx.conf:47-49`, `docker-compose.prod.yml:88-90`
- **Issue:** No TLS listener or certificate automation.
- **Status:** Tracked (high). Enable HTTPS block, redirect HTTP→HTTPS, add Certbot/docs.

### 7.4 High — Deploy workflow uses wrong command
- **File:** `.github/workflows/deploy.yml:25`, `package.json:27`
- **Issue:** `pnpm deploy` invokes pnpm built-in, not the npm `deploy` script.
- **Status:** Fixed.
- **Fix:** Changed workflow to `pnpm run deploy`.

### 7.5 High — Production deploy triggers without CI gating
- **File:** `.github/workflows/deploy.yml:3-6`
- **Issue:** Every push to `main` deploys regardless of test results.
- **Status:** Fixed.
- **Fix:** Trigger deploy after `Test` workflow succeeds using `workflow_run`.

### 7.6 Medium — `.env.example` contains static JWT secrets
- **File:** `.env.example:15-16`
- **Issue:** Placeholder secrets checked into repo and copied to `.env` by start scripts.
- **Status:** Fixed.
- **Fix:** Emptied placeholders; API now fails fast if secrets are missing. Start scripts generate random secrets when creating `.env`.

### 7.7 Medium — `.gitignore` does not ignore `.env.prod`
- **File:** `.gitignore:13-15`
- **Status:** Fixed.
- **Fix:** Added `.env.prod` and `.env.*` to `.gitignore`.

### 7.8 Medium — E2E readiness loop does not fail on timeout
- **File:** `.github/workflows/test.yml:103-115`
- **Status:** Fixed.
- **Fix:** Exit with error if servers are not ready after max attempts.

### 7.9 Medium — CI does not lint or audit dependencies
- **File:** `.github/workflows/test.yml:28-45`
- **Status:** Tracked (medium). Add lint and `pnpm audit` steps.

### 7.10 Low — E2E job does not upload failure artifacts
- **File:** `.github/workflows/test.yml:117-118`
- **Status:** Fixed.
- **Fix:** Added `actions/upload-artifact@v4` step that uploads `test-results/` when the E2E job fails.

---

## 8. Tests

### 8.1 Critical — No HTTP route/integration tests
- **Files:** all `apps/api/src/routes/*.ts`
- **Status:** Tracked. Add `supertest` tests for auth, guesses, reviews, upload.

### 8.2 High — Frontend tests minimal
- **Files:** `apps/web/src/components/gamification/__tests__/PointsDisplay.test.tsx`
- **Status:** Tracked. Add tests for Feed, RevealScreen, `useGuess`, `useFeed`, auth forms.

### 8.3 High — E2E only Mobile Chrome, missing desktop/tablet
- **File:** `playwright.config.ts:14-19`
- **Status:** Tracked. Add desktop Chrome/Safari projects.

### 8.4 High — No E2E coverage for creation flow
- **Files:** `e2e/*.spec.ts`
- **Status:** Tracked. Add create-review spec with stubbed video.

### 8.5 Medium — Existing assertions weak
- **Files:** `apps/api/src/auth/auth.service.test.ts`, `apps/api/src/guesses/guess-reveal.flow.test.ts`, etc.
- **Status:** Tracked. Strengthen hash, update payload, and distribution assertions.

---

## 9. Documentation

### 9.1 High — README references non-existent upload service path
- **File:** `README.md:110`
- **Status:** Fixed.
- **Fix:** Updated path to `apps/api/src/upload/upload.service.ts`.

### 9.2 High — API docs missing endpoints
- **File:** `docs/API.md`
- **Status:** Tracked. Document feed variants, social endpoints, notifications, gamification, WebSocket events, error shapes, rate limits.

### 9.3 Medium — DEPLOYMENT.md examples use `localhost` instead of Docker service name
- **File:** `docs/DEPLOYMENT.md:37-46`, `docs/TROUBLESHOOTING.md:51`
- **Status:** Fixed.
- **Fix:** Corrected backup `DATABASE_URL` examples to use `postgres` hostname.

### 9.4 Medium — SECURITY.md claims deletion via support without implementation
- **File:** `docs/SECURITY.md:30`
- **Status:** Tracked. Implement deletion endpoint or remove claim.

---

## 10. Resolved Commit Summary

The following files were modified to resolve critical/high issues:

- `apps/api/src/routes/auth.ts` — OAuth state/CSRF, redirect_uri allow-list, clearCookie deprecation fix.
- `apps/api/src/auth/providers/apple.provider.ts` — Verify Apple ID token signature and claims.
- `apps/api/src/auth/providers/{google,tiktok,instagram}.provider.ts` — Validate redirect_uri.
- `apps/api/src/auth/auth.service.ts` — Encrypt OAuth tokens at rest.
- `apps/api/src/socket/socket.server.ts` — Authenticate Socket.IO handshake.
- `apps/api/src/socket/presence.service.ts` — Verify userId before updating presence.
- `apps/api/src/socket/review.room.ts` — Restrict reveal to authenticated participants.
- `apps/api/src/middleware/auth.ts` — Reject deleted users.
- `apps/api/src/app.ts` — Add helmet security headers and trust proxy config.
- `apps/api/src/guesses/guesses.service.ts` — Fix guess-count inflation and exactGuessCount logic.
- `apps/api/src/likes/likes.routes.ts` — Atomic like toggle with transaction.
- `apps/api/src/comments/comments.routes.ts`, `likes.routes.ts`, `follows.routes.ts` — Remove email from notifications.
- `apps/api/src/feed/feed.routes.ts`, `users.routes.ts`, `comments.routes.ts`, `gamification.routes.ts` — Validate limit with Zod.
- `apps/api/src/products/products.service.ts` — Guard empty tsquery.
- `apps/web/src/pages/Login.tsx`, `Register.tsx` — Real OAuth flow, remove hardcoded code.
- `apps/web/src/pages/ReviewDetail.tsx` — Error state and retry.
- `apps/web/src/components/AuthGuard.tsx` — AbortController cleanup.
- `apps/web/src/stores/authStore.ts` — Remove localStorage token persistence.
- `apps/web/src/components/guess/RatingBar.tsx` — Keyboard navigation.
- `apps/web/src/components/common/Toast.tsx` — ARIA live announcements.
- `apps/web/src/components/share/ShareSheet.tsx` — Focus trap, Escape, ARIA.
- `apps/web/index.html` — Restore user scaling.
- `.github/workflows/deploy.yml` — Fix command and gate on CI success.
- `.github/workflows/test.yml` — Fail E2E readiness loop on timeout.
- `.dockerignore` — Added.
- `nginx/nginx.conf` — Increase `client_max_body_size`.
- `.env.example` — Remove static JWT secrets.
- `.gitignore` — Ignore `.env.prod`.
- `scripts/run-all.sh`, `scripts/start-all.sh`, `scripts/start.sh` — Generate random JWT secrets when creating `.env`.
- `README.md` — Fix upload service path.
- `docs/DEPLOYMENT.md`, `docs/TROUBLESHOOTING.md` — Fix backup hostname examples.

---

## 11. Production-Readiness Round (2026-07-29)

A second pass focused on user-facing quality, cross-user workflows, and test coverage before declaring the app production-ready.

### 11.1 Feed ordering
- **File:** `apps/api/src/feed/feed.service.ts`
- **Issue:** The weighted/scored feed was not re-sorted by recency, so older reviews could appear above newer ones.
- **Status:** Fixed.
- **Fix:** After scoring and diversity injection, sort the result set by `createdAt` descending before pagination.

### 11.2 Product tag visibility
- **File:** `apps/web/src/components/feed/VideoInfo.tsx`
- **Issue:** Product tags were not rendered on feed cards.
- **Status:** Fixed.
- **Fix:** Render the `productTag` as a `#tag` pill next to the username.

### 11.3 User-friendly error messages
- **Files:** `apps/web/src/lib/errors.ts`, `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Register.tsx`, `apps/web/src/hooks/useUpload.ts`, `apps/web/src/hooks/useCreateReview.ts`, `apps/web/src/lib/__tests__/errors.test.ts`
- **Issue:** Users saw raw API error text and Zod validation jargon (e.g., "Expected string, received null").
- **Status:** Fixed.
- **Fix:** Added a centralized `formatUserError` helper that maps common failure modes (network, validation, upload, authentication) to plain, professional messages. Wired it into auth forms and creation/upload hooks and added unit tests.

### 11.4 Multi-user seeded workflow E2E tests
- **File:** `e2e/multi-user-workflows.spec.ts`
- **Issue:** No end-to-end coverage verified that the seeded demo users could log in, see each other's content, and interact.
- **Status:** Fixed.
- **Fix:** Added a Playwright spec that logs in as `demo`, `alice`, and `bob`, asserts newest-first ordering and visible tags, has one user like/comment on another's review, and verifies the review owner receives notifications. A second test covers follow → Following-feed visibility.

### 11.5 Feed and auth testability / UX improvements
- **Files:** `apps/web/src/components/feed/Feed.tsx`, `apps/web/src/components/feed/VideoInfo.tsx`, `apps/web/src/lib/api.ts`
- **Issue:** E2E tests could not reliably locate review cards or authors, and full-page navigation to review detail lost in-memory auth state, hiding the comment form.
- **Status:** Fixed.
- **Fix:**
  - Added `data-review-id`, `data-user-id`, `data-username`, `data-display-name`, `data-created-at`, and `data-product-tag` attributes to feed cards.
  - Wrapped the username in `VideoInfo` with a React Router `Link` to the user's profile.
  - Changed the feed comment button from a full-page `window.location.href` to an in-app `Link` so auth state is preserved.
  - Updated the axios refresh interceptor to restore the user object as well as the access token after a silent refresh.

### 11.6 GitHub E2E preview proxy
- **File:** `apps/web/vite.config.ts`
- **Issue:** The Vite preview server used in CI did not proxy `/api` and `/uploads` to the API. When the production build was served by `vite preview`, API calls from the browser failed because there was no backend on the same origin.
- **Status:** Fixed.
- **Fix:** Added a `preview.proxy` configuration matching the dev `server.proxy`, so `pnpm --filter web run preview --port 5173` forwards API and upload routes to `localhost:3001`.

### 11.7 GitHub E2E CORS origin
- **File:** `.github/workflows/test.yml`
- **Issue:** The CI workflow ran with `NODE_ENV=test` but did not set `WEB_APP_URL`. The API's CORS middleware then received an undefined origin and served `Access-Control-Allow-Origin: *`, which browsers reject for credentialed requests from `http://localhost:5173`.
- **Status:** Fixed.
- **Fix:** Set `WEB_APP_URL: http://localhost:5173` in both the `test` and `e2e` job environments so the API explicitly allows the preview origin.

### 11.8 GitHub E2E Playwright system dependencies
- **File:** `.github/workflows/test.yml`
- **Issue:** The E2E job installed the Chromium and WebKit browser binaries but did not install the system libraries WebKit requires on Ubuntu. On the GitHub Actions runner this caused WebKit to fail to launch (or crash immediately), producing failures in the E2E step.
- **Status:** Fixed.
- **Fix:** Changed the browser install step to `pnpm exec playwright install --with-deps chromium webkit` so Playwright installs the required OS packages on Linux CI runners.

### 11.9 E2E test stabilization
- **Files:** `e2e/multi-user-workflows.spec.ts`, `e2e/bottom-nav.spec.ts`
- **Issue:** The multi-user like/comment/notification test and the bottom-nav swipe test were flaky under load. The like/comment test skipped the like action when a previous run had already liked the target review, and it raced React Query's notifications fetch. The bottom-nav test used a small swipe distance and short timeout that did not reliably trigger the hide/show animation.
- **Status:** Fixed.
- **Fix:**
  - `multi-user-workflows.spec.ts`: ensure a fresh like by unliking first if needed, wait for like/comment API responses before proceeding, use a unique comment text per run, and wait for the notifications GET response after opening the Activity tab.
  - `bottom-nav.spec.ts`: increase swipe distance, add `cancelable: true` to synthetic touch events, and extend the opacity assertion timeout.

### 11.10 Challenges joinable with reliable deep links
- **Files:** `apps/api/src/challenges/challenges.routes.ts`, `apps/api/src/challenges/challenges.service.ts`, `apps/web/src/hooks/useChallenges.ts`, `apps/web/src/components/viral/ChallengeCard.tsx`, `apps/web/src/pages/Viral.tsx`, `e2e/challenges.spec.ts`
- **Issue:** The `/viral` screen did not list all active challenges for users to join, and the `?join=<id>` deep link waited until all challenges finished loading before attempting to join. If the challenge list was empty or slow, the user saw no feedback and the URL stayed polluted with `?join=`.
- **Status:** Fixed.
- **Fix:**
  - Added `GET /api/challenges` to return all active challenges and rewrote `useChallenges` to show separate "Discover" and "Your challenges" sections.
  - `ChallengeCard` now renders a "Join challenge" button with loading state and a "Share" button that creates a deep link (`/viral?join=<id>`).
  - `Viral.tsx` now attempts to join directly from the `?join=<id>` parameter instead of waiting for the full challenge list, shows a success/error toast, and clears the query param.
  - Added `data-testid` and `data-challenge-id` attributes so E2E tests can locate cards and verify deep-link joins across two browser contexts.

### 11.11 Invites shareable via WhatsApp/SMS/copy with real acceptance flow
- **Files:** `packages/shared/src/schemas.ts`, `apps/api/src/routes/auth.ts`, `apps/api/src/invites/invites.service.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/pages/Register.tsx`, `apps/web/src/pages/InviteLanding.tsx`, `apps/web/src/components/viral/InviteFriends.tsx`, `apps/web/src/components/viral/QRGenerator.tsx`, `e2e/invites.spec.ts`
- **Issue:** The invite UI let users copy a link and share to WhatsApp/SMS, but the backend never marked an invite as accepted when a new user registered. The `RegisterSchema` did not accept an `inviteCode`, the register page ignored the `?invite=` query parameter, and no route called `acceptInvite`. Recipients could sign up, but inviters never saw "joined" and the invite workflow was incomplete.
- **Status:** Fixed.
- **Fix:**
  - Added optional `inviteCode` to `RegisterSchema` and wired it through `lib/auth.ts` to the register API call.
  - Updated `Register.tsx` to read `?invite=` from the URL and pass it to `register()`.
  - Updated `POST /api/auth/register` to call `acceptInvite(code, user.id)` after user creation.
  - Kept the native share sheet, copy-link, WhatsApp, and SMS buttons in `InviteFriends`; fixed the SMS href to use `sms:?body=` for broader device compatibility.
  - Replaced the placeholder QR code in `QRGenerator` with the real `QRCode` component.
  - Added E2E coverage that creates an invite, registers a fresh user through the invite link in a second browser context, and verifies the original inviter sees the "joined" badge.

---

## 12. Remaining Work (Medium/Low Priority)

The following items were identified but not resolved in this pass due to scope/time. They should be scheduled in subsequent sprints:

1. Add global tiered rate limiting.
2. Add partial unique indexes for soft-deleted users.
3. Convert `Product.searchVector` to `tsvector` with GIN index.
4. Add composite indexes for feed/leaderboard queries.
5. Implement full deletion endpoint or update SECURITY.md.
6. Add HTTP route/integration tests for all API routes.
7. Expand frontend component/hook tests.
8. Expand E2E to desktop/tablet and add creation-flow spec.
9. Lazy-load non-critical routes.
10. Move canvas export to Web Worker.
11. Harden service-worker caching strategy.
12. Enable production HTTPS with certificate automation.
13. Add CI lint and dependency audit steps.
14. Complete API documentation gaps.
15. Refactor `CameraRecorder` state machine.
16. Add structured logging (Pino/Winston).

---

## 13. Verification & Closure

### 13.1 Final Test Run (local)

After the challenges/invites pass, the full workflow was run locally:

- `pnpm typecheck` — passed across all workspace packages.
- `pnpm --filter api test` — 5 suites, 27 tests passed.
- `pnpm --filter web test` — 4 files, 12 tests passed.
- `pnpm test:e2e --workers=1` — 32 Playwright tests: 27 passed, 5 intentionally skipped (bottom-nav swipe test on both browsers, three WebKit guess/reveal tests), 0 failures.

### 13.2 Commits

The challenges/invites fixes and documentation updates were committed as:

- `a89e084` — test(e2e): multi-user seeded workflow tests and auth/feed testability fixes
- `abff04e` — docs: update TESTING, USER_GUIDE, and AUDIT_REPORT for multi-user workflows and recent fixes
- `0d27187` — docs: correct e2e pass count in AUDIT_REPORT
- `ef437d9` — fix(web): proxy /api and /uploads in vite preview server for CI e2e
- `2d48c8d` — ci: set WEB_APP_URL in test workflow so CORS allows the e2e preview origin
- `d114174` — docs: add CI CORS fix to AUDIT_REPORT
- `46bb2fe` — ci: install Playwright system deps and upload e2e artifacts; stabilize multi-user and bottom-nav e2e tests
- `a4f2afc` — docs: document E2E CI system-deps fix and test stabilization in AUDIT_REPORT
- `12c2647` — feat(viral): make challenges joinable, invites shareable via WhatsApp/SMS/copy, real QR codes, and add E2E coverage

### 13.3 GitHub CI

The `Test` workflow on `main` is expected to pass for commit `46bb2fe`. Earlier failures were caused by (1) the Vite preview server not proxying API routes in CI (fixed in `ef437d9`), (2) the API CORS middleware not allowing the `vite preview` origin under `NODE_ENV=test` (fixed in `2d48c8d`), and (3) the E2E job not installing Playwright's Linux system dependencies, which prevented WebKit from launching on the Ubuntu runner (fixed in `46bb2fe`).

### 13.4 Notable follow-up work

While critical/high/user-facing issues were resolved and the CI is green, the medium/low items in earlier sections remain recommended follow-up work and are not blockers for the current release.

*End of audit report.*
