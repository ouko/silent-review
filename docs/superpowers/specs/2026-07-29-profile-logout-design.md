# Profile Logout Button — Design Spec

## Goal
Give users a clear, one-tap way to log out of the Silent Review app from their own profile screen.

## Background
- `apps/web/src/lib/auth.ts` already exports `logout()`, which POSTs to `/api/auth/logout`, clears the Zustand auth store, and redirects to `/login`.
- `apps/web/src/stores/authStore.ts` has the `logout` action.
- `apps/web/src/components/profile/Profile.tsx` renders an "Edit profile" placeholder button when viewing the current user's profile (`isMe`), but no logout affordance exists.

## Chosen Approach
**Approach B: stack "Edit profile" and "Log out" buttons.**

This keeps the existing placeholder and adds a clearly labeled, full-width logout button directly beneath it. It is the most discoverable option and matches the current card-based UI style.

## UI/UX Details
- Location: inside the profile header card, in the existing `Action` section.
- Order: `Edit profile` on top, `Log out` below.
- Logout button style:
  - `LogOut` icon from `lucide-react`.
  - Rounded-2xl, full width.
  - Slightly de-emphasized compared to the primary action (e.g., border-only or lower opacity background) so it does not compete with the main profile action.
- Interaction:
  - On tap, call `logout()`.
  - Disable the button and show a brief loading state while the request is in flight.
  - On completion, the helper redirects to `/login` automatically.

## Data Flow
1. User taps "Log out".
2. `logout()` POSTs `/api/auth/logout`.
3. Auth store is cleared (`user` and `accessToken` set to `null`).
4. Browser navigates to `/login`.

## Error Handling
- The existing `logout()` helper uses `try/finally`, so even if the server request fails the local session is cleared and the user is redirected. This is acceptable for logout.
- The UI button should still disable during the call to prevent double-taps.

## Testing
- Add/update a Playwright test or component test asserting:
  - The logout button is visible on `/profile/me`.
  - Tapping it redirects to `/login`.
- Run `pnpm --filter web typecheck` after the change.

## Files Affected
- `apps/web/src/components/profile/Profile.tsx`
- Possibly `apps/web/src/components/profile/Profile.test.tsx` or an E2E spec if one exists.
