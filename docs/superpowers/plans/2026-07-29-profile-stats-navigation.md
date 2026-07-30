# Clickable Profile Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the profile stat cards (Reviews, Followers, Following) tappable. Reviews selects the Reviews tab; Followers and Following open a bottom sheet modal with a scrollable user list.

**Architecture:** Add two paginated API endpoints in `apps/api/src/routes/users.ts`, expose them through React Query hooks, build a reusable `UserList` component and a `UserListSheet` bottom sheet, and make the profile `StatCard` buttons trigger the right action.

**Tech Stack:** Express, Prisma, React, React Router, React Query (TanStack Query), Tailwind CSS, lucide-react, Playwright.

## Global Constraints
- Match the existing glassmorphism/card visual style (`rounded-2xl`, `border-white/10`, `bg-white/5`).
- Use `lucide-react` icons only.
- Reuse `FollowButton` for follow/unfollow actions in lists.
- Use `formatUserError` for any user-facing API errors.
- Keep changes minimal; do not refactor unrelated profile code.
- Target branch is `feat/video-moderation`.
- All checks (`typecheck`, relevant tests) must pass before commit.

---

### Task 1: Add API endpoints for followers and following

**Files:**
- Modify: `apps/api/src/routes/users.ts:99` (append after the existing reviews endpoint)

**Interfaces:**
- Consumes: `prisma` follow model, `optionalAuth` middleware.
- Produces: `GET /api/users/:id/followers` and `GET /api/users/:id/following`, both returning `{ users: UserSummary[], nextCursor?: string }`.

- [ ] **Step 1: Read the current users route file**

  Read `apps/api/src/routes/users.ts` to confirm the existing endpoint shape and the `LimitSchema`.

- [ ] **Step 2: Append the followers endpoint**

  After the existing `/api/users/:id/reviews` endpoint, add:

  ```ts
  usersRouter.get("/:id/followers", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = LimitSchema.parse(req.query.limit);

      const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const followers = await prisma.follow.findMany({
        where: { followingId: req.params.id },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          follower: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      const nextCursor = followers.length === limit ? followers[followers.length - 1].id : undefined;

      const viewerId = req.user?.id;
      const users = await Promise.all(
        followers.map(async (f) => {
          const user = f.follower;
          let isFollowing = false;
          if (viewerId && viewerId !== user.id) {
            const follow = await prisma.follow.findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
            });
            isFollowing = !!follow;
          }
          return { ...user, isFollowing };
        })
      );

      res.json({ users, nextCursor });
    } catch (err) {
      next(err);
    }
  });
  ```

- [ ] **Step 3: Append the following endpoint**

  After the followers endpoint, add:

  ```ts
  usersRouter.get("/:id/following", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = LimitSchema.parse(req.query.limit);

      const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const following = await prisma.follow.findMany({
        where: { followerId: req.params.id },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          following: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      const nextCursor = following.length === limit ? following[following.length - 1].id : undefined;

      const viewerId = req.user?.id;
      const users = await Promise.all(
        following.map(async (f) => {
          const user = f.following;
          let isFollowing = false;
          if (viewerId && viewerId !== user.id) {
            const follow = await prisma.follow.findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
            });
            isFollowing = !!follow;
          }
          return { ...user, isFollowing };
        })
      );

      res.json({ users, nextCursor });
    } catch (err) {
      next(err);
    }
  });
  ```

- [ ] **Step 4: Run API tests**

  Run: `pnpm --filter api test`
  Expected: All existing tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/routes/users.ts
  git commit -m "feat(api): add followers and following list endpoints"
  ```

---

### Task 2: Add React hooks for followers and following

**Files:**
- Modify: `apps/web/src/hooks/useProfile.ts`

**Interfaces:**
- Consumes: New API endpoints `/api/users/:id/followers` and `/api/users/:id/following`.
- Produces: `useFollowers(userId?)` and `useFollowing(userId?)` hooks returning paginated `UserSummary` lists.

- [ ] **Step 1: Add the UserSummary type and hooks**

  Append to `apps/web/src/hooks/useProfile.ts`:

  ```ts
  export interface UserSummary {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isFollowing: boolean;
  }

  export function useFollowers(userId?: string) {
    return useQuery<{ users: UserSummary[]; nextCursor?: string }>({
      queryKey: ["followers", userId],
      queryFn: async () => {
        const { data } = await api.get(`/api/users/${userId}/followers?limit=50`);
        return data;
      },
      enabled: !!userId,
    });
  }

  export function useFollowing(userId?: string) {
    return useQuery<{ users: UserSummary[]; nextCursor?: string }>({
      queryKey: ["following", userId],
      queryFn: async () => {
        const { data } = await api.get(`/api/users/${userId}/following?limit=50`);
        return data;
      },
      enabled: !!userId,
    });
  }
  ```

- [ ] **Step 2: Run web typecheck**

  Run: `pnpm --filter web typecheck`
  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/hooks/useProfile.ts
  git commit -m "feat(web): add useFollowers and useFollowing hooks"
  ```

---

### Task 3: Build UserList and UserListItem components

**Files:**
- Create: `apps/web/src/components/profile/UserList.tsx`
- Create: `apps/web/src/components/profile/UserListItem.tsx`

**Interfaces:**
- Consumes: `UserSummary` from `useProfile.ts`, `FollowButton` from `../social/FollowButton`, `Link` from `react-router-dom`.
- Produces: `UserList` component used by `UserListSheet`.

- [ ] **Step 1: Create UserListItem**

  Create `apps/web/src/components/profile/UserListItem.tsx`:

  ```tsx
  import { Link } from "react-router-dom";
  import { User } from "lucide-react";
  import { FollowButton } from "../social/FollowButton";
  import type { UserSummary } from "../../hooks/useProfile";

  interface UserListItemProps {
    user: UserSummary;
  }

  export function UserListItem({ user }: UserListItemProps) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
        <Link to={`/profile/${user.id}`} className="relative shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 ring-2 ring-white/10">
              <User className="h-6 w-6 text-white" />
            </div>
          )}
        </Link>
        <Link to={`/profile/${user.id}`} className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">
            {user.displayName ?? user.username}
          </p>
          <p className="truncate text-sm text-white/50">@{user.username}</p>
        </Link>
        <FollowButton userId={user.id} isFollowing={user.isFollowing} size="sm" />
      </div>
    );
  }
  ```

- [ ] **Step 2: Create UserList**

  Create `apps/web/src/components/profile/UserList.tsx`:

  ```tsx
  import { UserListItem } from "./UserListItem";
  import type { UserSummary } from "../../hooks/useProfile";

  interface UserListProps {
    users: UserSummary[];
    emptyMessage: string;
  }

  export function UserList({ users, emptyMessage }: UserListProps) {
    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-white/50">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 overflow-y-auto p-1">
        {users.map((user) => (
          <UserListItem key={user.id} user={user} />
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 3: Run web typecheck**

  Run: `pnpm --filter web typecheck`
  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/components/profile/UserList.tsx apps/web/src/components/profile/UserListItem.tsx
  git commit -m "feat(web): add UserList and UserListItem components"
  ```

---

### Task 4: Build the UserListSheet bottom sheet

**Files:**
- Create: `apps/web/src/components/profile/UserListSheet.tsx`

**Interfaces:**
- Consumes: `useFollowers`/`useFollowing` hooks, `UserList` component, `X` icon from lucide-react.
- Produces: `UserListSheet` component rendered via portal.

- [ ] **Step 1: Create UserListSheet**

  Create `apps/web/src/components/profile/UserListSheet.tsx`:

  ```tsx
  import { useEffect, useRef, useState } from "react";
  import { createPortal } from "react-dom";
  import { X } from "lucide-react";
  import { useFollowers, useFollowing, type UserSummary } from "../../hooks/useProfile";
  import { UserList } from "./UserList";
  import { Loading } from "../common/Loading";

  interface UserListSheetProps {
    userId: string;
    username: string;
    type: "followers" | "following";
    onClose: () => void;
  }

  export function UserListSheet({ userId, username, type, onClose }: UserListSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const backdropPointer = useRef<{ x: number; y: number } | null>(null);
    const dragStartY = useRef<number | null>(null);
    const [dragDelta, setDragDelta] = useState(0);
    const [mounted, setMounted] = useState(false);

    const isFollowers = type === "followers";
    const title = isFollowers ? "Followers" : "Following";
    const emptyMessage = isFollowers ? "No followers yet." : "Not following anyone yet.";

    const followersQuery = useFollowers(isFollowers ? userId : undefined);
    const followingQuery = useFollowing(!isFollowers ? userId : undefined);
    const query = isFollowers ? followersQuery : followingQuery;

    useEffect(() => setMounted(true), []);

    useEffect(() => {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const sheet = sheetRef.current;
      if (!sheet) return;

      const focusable = sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key !== "Tab") return;
        const elements = Array.from(focusable).filter(
          (el) => !(el as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled
        );
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }, [onClose]);

    const sheet = (
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-black/80"
        role="presentation"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            backdropPointer.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerUp={(e) => {
          if (e.target !== e.currentTarget || !backdropPointer.current) return;
          const dx = e.clientX - backdropPointer.current.x;
          const dy = e.clientY - backdropPointer.current.y;
          backdropPointer.current = null;
          if (Math.hypot(dx, dy) < 10) onClose();
        }}
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}
      >
        <div className="flex min-h-full items-end justify-center p-4">
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="userlist-title"
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-zinc-900 p-5 text-white"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
            <div
              className="flex cursor-grab flex-col items-center pb-2 active:cursor-grabbing"
              onPointerDown={(e) => {
                dragStartY.current = e.clientY;
                setDragDelta(0);
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragStartY.current == null) return;
                const delta = Math.max(0, e.clientY - dragStartY.current);
                setDragDelta(delta);
              }}
              onPointerUp={(e) => {
                if (dragStartY.current == null) return;
                const delta = e.clientY - dragStartY.current;
                dragStartY.current = null;
                setDragDelta(0);
                if (delta > 80) onClose();
              }}
              onPointerCancel={() => {
                dragStartY.current = null;
                setDragDelta(0);
              }}
              style={{
                transform: `translateY(${dragDelta}px)`,
                transition: dragDelta === 0 ? "transform 0.2s ease-out" : undefined,
              }}
            >
              <div className="mb-3 h-1 w-12 rounded-full bg-white/30" aria-hidden="true" />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 id="userlist-title" className="text-lg font-bold">{title}</h2>
                <p className="text-sm text-white/50">@{username}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {query.isLoading || !query.data ? (
                <Loading />
              ) : (
                <UserList users={query.data.users} emptyMessage={emptyMessage} />
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return mounted ? createPortal(sheet, document.body) : null;
  }
  ```

- [ ] **Step 2: Run web typecheck**

  Run: `pnpm --filter web typecheck`
  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/components/profile/UserListSheet.tsx
  git commit -m "feat(web): add UserListSheet bottom sheet"
  ```

---

### Task 5: Make profile stat cards clickable

**Files:**
- Modify: `apps/web/src/components/profile/Profile.tsx`

**Interfaces:**
- Consumes: `UserListSheet` component.
- Produces: Clickable stat cards that select the Reviews tab or open the sheet.

- [ ] **Step 1: Add imports and sheet state**

  In `apps/web/src/components/profile/Profile.tsx`:

  - Add import:
    ```tsx
    import { UserListSheet } from "./UserListSheet";
    ```

  - Add state near the top of the component:
    ```tsx
    const [sheetType, setSheetType] = useState<"followers" | "following" | null>(null);
    ```

- [ ] **Step 2: Replace StatCard and wire click handlers**

  Replace the `StatCard` function with:

  ```tsx
  function StatCard({
    value,
    label,
    onClick,
  }: {
    value: number;
    label: string;
    onClick?: () => void;
  }) {
    const content = (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm transition-colors hover:bg-white/10">
        <p className="text-xl font-black tracking-tighter gradient-text">{value.toLocaleString()}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
      </div>
    );

    if (onClick) {
      return (
        <button onClick={onClick} className="w-full text-left">
          {content}
        </button>
      );
    }
    return content;
  }
  ```

  Replace the stats grid:
  ```tsx
  <StatCard value={profile.reviewCount} label="Reviews" onClick={() => setActiveTab("reviews")} />
  <StatCard value={profile.followerCount} label="Followers" onClick={() => setSheetType("followers")} />
  <StatCard value={profile.followingCount} label="Following" onClick={() => setSheetType("following")} />
  ```

  Render the sheet after the header card (before the tabs):
  ```tsx
  {sheetType && (
    <UserListSheet
      userId={userId}
      username={profile.username}
      type={sheetType}
      onClose={() => setSheetType(null)}
    />
  )}
  ```

- [ ] **Step 3: Run web typecheck**

  Run: `pnpm --filter web typecheck`
  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/components/profile/Profile.tsx
  git commit -m "feat(web): make profile stat cards clickable"
  ```

---

### Task 6: Add E2E tests

**Files:**
- Create: `e2e/profile-stats.spec.ts`

**Interfaces:**
- Consumes: Clickable stat cards and `UserListSheet`.
- Produces: Passing Playwright tests.

- [ ] **Step 1: Create the E2E spec**

  Create `e2e/profile-stats.spec.ts`:

  ```ts
  import { test, expect } from "@playwright/test";
  import { loginDemoUser } from "./helpers/auth";

  test.describe("profile stats navigation", () => {
    test("clicking reviews count selects the reviews tab", async ({ page }) => {
      await loginDemoUser(page);
      await page.goto("/profile/me");

      await page.getByRole("button", { name: /^reviews$/i }).click();
      await expect(page.getByRole("tab", { name: /reviews/i })).toHaveAttribute("aria-selected", "true");
    });

    test("clicking followers count opens the followers sheet", async ({ page }) => {
      await loginDemoUser(page);
      await page.goto("/profile/me");

      await page.getByRole("button", { name: /^followers$/i }).click();
      await expect(page.getByRole("dialog", { name: /followers/i })).toBeVisible();
      await expect(page.getByText("Followers")).toBeVisible();
    });

    test("clicking following count opens the following sheet", async ({ page }) => {
      await loginDemoUser(page);
      await page.goto("/profile/me");

      await page.getByRole("button", { name: /^following$/i }).click();
      await expect(page.getByRole("dialog", { name: /following/i })).toBeVisible();
      await expect(page.getByText("Following")).toBeVisible();
    });
  });
  ```

- [ ] **Step 2: Run the new E2E spec**

  Run: `pnpm test:e2e e2e/profile-stats.spec.ts`
  Expected: Tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add e2e/profile-stats.spec.ts
  git commit -m "test(e2e): add profile stats navigation tests"
  ```

---

### Task 7: Final verification and push

**Files:**
- None (verification only).

- [ ] **Step 1: Run full local checks**

  Run:
  ```bash
  pnpm typecheck
  pnpm --filter api test
  pnpm --filter web test
  pnpm test:e2e --workers=1
  ```
  Expected: All pass.

- [ ] **Step 2: Push the branch**

  ```bash
  git push origin feat/video-moderation
  ```

---

## Self-Review

**Spec coverage:**
- Clickable Reviews/Followers/Following stat cards → Task 5.
- Reviews selects tab → Task 5.
- Followers/Following open bottom sheet → Tasks 4 and 5.
- New API endpoints → Task 1.
- React hooks → Task 2.
- UserList/UserListItem components → Task 3.
- UserListSheet component → Task 4.
- E2E tests → Task 6.
- Final verification → Task 7.

**Placeholder scan:** No TBD/TODO/vague steps. Each code step contains the exact code to write.

**Type consistency:**
- `UserSummary` is defined in `useProfile.ts` and consumed by `UserList`, `UserListItem`, and `UserListSheet`.
- `useFollowers`/`useFollowing` return `{ users: UserSummary[]; nextCursor?: string }`.
- `FollowButton` `size` prop accepts `"sm"`.
