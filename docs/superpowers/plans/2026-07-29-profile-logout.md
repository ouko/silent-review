# Profile Logout Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clearly labeled, one-tap logout button to the current user's profile screen.

**Architecture:** Extend the existing `Profile` component's action area to render a second full-width button below the "Edit profile" placeholder. The new button uses the shared `logout()` helper from `apps/web/src/lib/auth.ts`, which handles the API call, store cleanup, and redirect.

**Tech Stack:** React, Tailwind CSS, lucide-react, Zustand auth store, existing `logout()` helper.

## Global Constraints
- Match the existing glassmorphism/card visual style (`rounded-2xl`, `border-white/10`, `bg-white/5`, etc.).
- Use `lucide-react` icons only.
- Keep the change minimal; do not refactor unrelated profile code.
- The `feat/video-moderation` branch is the target branch.
- All checks (`typecheck`, relevant tests) must pass before commit.

---

### Task 1: Add the logout button to the Profile component

**Files:**
- Modify: `apps/web/src/components/profile/Profile.tsx:94-103`

**Interfaces:**
- Consumes: `logout()` from `apps/web/src/lib/auth.ts`, `LogOut` icon from `lucide-react`.
- Produces: A new logout button rendered when `isMe` is true.

- [ ] **Step 1: Read the current Profile component**

  Read `apps/web/src/components/profile/Profile.tsx` to confirm the action area at lines 94-103.

- [ ] **Step 2: Add imports**

  Add `LogOut` to the `lucide-react` import and import `logout` from the auth helper.

  ```tsx
  import { Flame, Award, User, Pencil, LogOut } from "lucide-react";
  import { logout } from "../../lib/auth";
  ```

- [ ] **Step 3: Add loading state**

  Add a local state hook near the top of the component:

  ```tsx
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  ```

- [ ] **Step 4: Replace the action area with stacked buttons**

  Change the action area (lines 94-103) from:

  ```tsx
  <div className="mt-5 w-full max-w-sm">
    {!isMe ? (
      <FollowButton userId={userId} isFollowing={profile.isFollowing} />
    ) : (
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10">
        <Pencil className="h-4 w-4" />
        Edit profile
      </button>
    )}
  </div>
  ```

  to:

  ```tsx
  <div className="mt-5 w-full max-w-sm space-y-2">
    {!isMe ? (
      <FollowButton userId={userId} isFollowing={profile.isFollowing} />
    ) : (
      <>
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10">
          <Pencil className="h-4 w-4" />
          Edit profile
        </button>
        <button
          onClick={async () => {
            setIsLoggingOut(true);
            await logout();
          }}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </>
    )}
  </div>
  ```

- [ ] **Step 5: Run typecheck**

  Run: `pnpm --filter web typecheck`
  Expected: No errors.

- [ ] **Step 6: Commit the component change**

  ```bash
  git add apps/web/src/components/profile/Profile.tsx
  git commit -m "feat(profile): add logout button for own profile"
  ```

---

### Task 2: Add a logout E2E test

**Files:**
- Create or modify: E2E test file covering the profile/logout flow (e.g., `apps/web/e2e/profile.spec.ts` or similar existing E2E spec).

**Interfaces:**
- Consumes: The new logout button rendered at `/profile/me`.
- Produces: A passing E2E test asserting logout redirects to `/login`.

- [ ] **Step 1: Locate the existing E2E profile/auth tests**

  Use `Glob` to find E2E specs: `apps/web/e2e/**/*.spec.ts`

- [ ] **Step 2: Add a logout test**

  If a profile or auth E2E spec exists, append:

  ```ts
  test('logs out from own profile', async ({ page }) => {
    await page.goto('/profile/me');
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL('/login');
  });
  ```

  If no suitable spec exists, create `apps/web/e2e/logout.spec.ts` with the above test plus the necessary `test`/`expect` imports and auth setup.

- [ ] **Step 3: Run the new test**

  Run: `pnpm --filter web e2e logout.spec.ts` (or equivalent Playwright command).
  Expected: Test passes.

- [ ] **Step 4: Commit the test**

  ```bash
  git add apps/web/e2e/...
  git commit -m "test(e2e): verify logout redirects to login"
  ```

---

### Task 3: Final verification and push

**Files:**
- None (verification only).

- [ ] **Step 1: Run web checks**

  Run: `pnpm --filter web typecheck && pnpm --filter web test`
  Expected: All pass.

- [ ] **Step 2: Push the branch**

  ```bash
  git push origin feat/video-moderation
  ```

---

## Self-Review

**Spec coverage:**
- Add logout button under Edit profile when `isMe` → Task 1, Step 4.
- Use `LogOut` icon from lucide-react → Task 1, Step 2.
- Call `logout()` from `apps/web/src/lib/auth.ts` → Task 1, Step 4.
- Disable/loading state during request → Task 1, Step 3 + Step 4.
- Run typecheck and tests → Task 1, Step 5; Task 3, Step 1.
- Commit to `feat/video-moderation` → Task 1, Step 6; Task 3, Step 2.

**Placeholder scan:** No TBD/TODO/vague steps. Each step contains exact code or commands.

**Type consistency:** `logout()` is imported as the existing async helper; `isLoggingOut` is a boolean; the button disables accordingly.
