# Clickable Profile Stats — Design Spec

 ## Goal
 Make the three profile stat cards (Reviews, Followers, Following) tappable so users can view the corresponding lists. Reviews selects the existing Reviews tab; Followers and Following open a bottom sheet modal with a scrollable user list.

 ## Background
 - `apps/web/src/components/profile/Profile.tsx` renders three non-interactive `StatCard` components.
 - The app already has `/profile/:id`, `/api/users/:id`, and `/api/users/:id/reviews`.
 - There are currently no endpoints or pages for listing a user's followers or following.
 - `apps/web/src/components/share/ShareSheet.tsx` provides an existing bottom-sheet modal pattern using `createPortal`.

 ## Chosen Approach
 **Approach B: bottom sheet modal.**

 The Reviews card selects the Reviews tab. The Followers and Following cards open a shared `UserListSheet` bottom sheet over the profile. This keeps the user in context, matches the mobile share-sheet pattern already in the app, and avoids adding new routes.

 ## UI/UX Details
 - The stat cards remain visually identical but become `button` elements (Reviews selects the tab; Followers/Following open the sheet).
 - Hover/focus states use the existing `hover:bg-white/10` style.
 - Reviews card: `setActiveTab("reviews")`.
 - Followers card: open sheet with title "Followers" and `useFollowers(userId)` data.
 - Following card: open sheet with title "Following" and `useFollowing(userId)` data.

 ### UserListSheet
 - `apps/web/src/components/profile/UserListSheet.tsx` (new)
 - Rendered via `createPortal` on `document.body`.
 - Backdrop tap and drag-down-to-dismiss, consistent with `ShareSheet`.
 - Header with title, close button, and profile username subtitle.
 - Scrollable vertical list of user rows inside the sheet.
 - Each row shows avatar, display name, username, and a Follow/Unfollow button (same `FollowButton` component used on profile).
 - Empty state: "No followers yet" / "Not following anyone yet".

 ### Shared list components
 - `apps/web/src/components/profile/UserList.tsx` — accepts a list of `UserSummary` items and renders rows.
 - `apps/web/src/components/profile/UserListItem.tsx` — single row; uses `FollowButton`.

 ## Data Flow
 1. User taps a stat card.
 2. Profile sets active tab or opens `UserListSheet` with the right query key.
 3. The sheet calls `useFollowers(userId)` or `useFollowing(userId)`.
 4. Hook fetches from the new API endpoint.
 5. `UserList` renders results.

 ## API Changes
 Add to `apps/api/src/routes/users.ts`:

 - `GET /api/users/:id/followers`
   - Returns users whose `followingId` is `:id`.
   - Includes `id`, `username`, `displayName`, `avatarUrl`, and `isFollowing` for the current viewer.
   - Supports `limit`/`cursor` pagination.

 - `GET /api/users/:id/following`
   - Returns users whose `followerId` is `:id`.
   - Same shape and pagination as above.

 ## Error Handling
 - API errors use the existing `formatUserError` helper on the frontend.
 - Empty arrays render friendly empty states inside the sheet.

 ## Testing
 - Add E2E tests:
   - Clicking Reviews count selects the Reviews tab.
   - Clicking Followers count opens the sheet and shows the title.
   - Clicking Following count opens the sheet and shows the title.
   - Follow/Unfollow buttons work inside the sheet.
 - Run `pnpm --filter web typecheck` and `pnpm test:e2e`.

 ## Files Affected
 - `apps/web/src/components/profile/Profile.tsx`
 - `apps/web/src/components/profile/UserListSheet.tsx` (new)
 - `apps/web/src/components/profile/UserList.tsx` (new)
 - `apps/web/src/components/profile/UserListItem.tsx` (new)
 - `apps/web/src/hooks/useProfile.ts` (add `useFollowers`, `useFollowing`, `UserSummary`)
 - `apps/api/src/routes/users.ts`
 - `e2e/profile-stats.spec.ts` (new)
