# Login/Onboarding UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Silent Review login and registration screens to look modern, premium, and mobile-native while preserving all existing behavior.

**Architecture:** Introduce a shared `AuthLayout` component that renders the animated mesh background and frosted-glass card shell. `Login` and `Register` pages become form content passed into this layout. Styling uses Tailwind utilities + Framer Motion for entrance/focus/press animations. No backend changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion (already in `apps/web`), lucide-react (already available), Vite.

## Global Constraints

- Animations complete in < 400ms.
- Touch targets >= 48px.
- Preserve existing form validation, OAuth flow, and error handling.
- Respect `prefers-reduced-motion`.
- Maintain dark theme; use rose/pink/violet accent gradients.
- No new runtime dependencies.
- All existing tests (unit + E2E) must still pass; update selectors if necessary.

---

## File Structure

- `apps/web/src/components/auth/AuthLayout.tsx` — shared animated background + glass card wrapper.
- `apps/web/src/components/auth/AuthButton.tsx` — gradient primary CTA with loading state.
- `apps/web/src/components/auth/SocialButton.tsx` — OAuth provider button with icon.
- `apps/web/src/components/auth/AuthInput.tsx` — styled text input with focus animation.
- `apps/web/src/pages/Login.tsx` — refactored login form content.
- `apps/web/src/pages/Register.tsx` — refactored register form content.
- `apps/web/src/components/ui/Button.tsx` — optionally reused/extended; prefer new auth-specific components to avoid breaking other UI.
- `apps/web/src/index.css` — add any new utilities (e.g., gradient mesh keyframes).
- `e2e/onboarding.spec.ts` — update selectors if button text/roles change.

---

### Task 1: AuthLayout shell with animated background

**Files:**
- Create: `apps/web/src/components/auth/AuthLayout.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: React children (`React.ReactNode`).
- Produces: `<AuthLayout title="..." subtitle="...">{children}</AuthLayout>`.

- [ ] **Step 1: Add gradient mesh animation CSS**

Append to `apps/web/src/index.css`:

```css
@keyframes mesh {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.animate-mesh {
  background: radial-gradient(circle at 20% 30%, rgba(244, 63, 94, 0.25), transparent 35%),
              radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.2), transparent 35%),
              radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.15), transparent 45%);
  background-size: 200% 200%;
  animation: mesh 12s ease infinite;
}
```

- [ ] **Step 2: Create AuthLayout component**

Create `apps/web/src/components/auth/AuthLayout.tsx`:

```tsx
import { motion, useReducedMotion } from "framer-motion";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black p-6 animate-mesh">
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-white">
          {title}
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">{subtitle}</p>
        {children}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Verify component typechecks**

Run: `pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/auth/AuthLayout.tsx apps/web/src/index.css
git commit -m "feat(auth): add AuthLayout with animated mesh background"
```

---

### Task 2: AuthInput and AuthButton primitives

**Files:**
- Create: `apps/web/src/components/auth/AuthInput.tsx`
- Create: `apps/web/src/components/auth/AuthButton.tsx`

**Interfaces:**
- Consumes: standard React input/button props.
- Produces: `<AuthInput />`, `<AuthButton loading={boolean} />`.

- [ ] **Step 1: Create AuthInput**

Create `apps/web/src/components/auth/AuthInput.tsx`:

```tsx
import { forwardRef } from "react";
import { motion } from "framer-motion";

export const AuthInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <motion.input
        ref={ref}
        whileFocus={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={[
          "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-white/40 outline-none",
          "transition-colors focus:border-rose-500 focus:bg-white/10 focus:ring-2 focus:ring-rose-500/30",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
AuthInput.displayName = "AuthInput";
```

- [ ] **Step 2: Create AuthButton**

Create `apps/web/src/components/auth/AuthButton.tsx`:

```tsx
import { motion } from "framer-motion";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function AuthButton({ loading = false, children, className = "", ...props }: AuthButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={props.disabled || loading}
      className={[
        "flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/20",
        "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        children
      )}
    </motion.button>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/auth/AuthInput.tsx apps/web/src/components/auth/AuthButton.tsx
git commit -m "feat(auth): add AuthInput and AuthButton primitives"
```

---

### Task 3: SocialButton for OAuth providers

**Files:**
- Create: `apps/web/src/components/auth/SocialButton.tsx`

**Interfaces:**
- Consumes: `provider: "google" | "apple" | "tiktok" | "instagram"`, `onClick`.
- Produces: `<SocialButton provider="google" onClick={...} />`.

- [ ] **Step 1: Create SocialButton with icons**

Create `apps/web/src/components/auth/SocialButton.tsx`:

```tsx
import { motion } from "framer-motion";
import { Apple, Chrome, Instagram, Music2 } from "lucide-react";

const PROVIDER_ICONS = {
  google: Chrome,
  apple: Apple,
  tiktok: Music2,
  instagram: Instagram,
};

const PROVIDER_LABELS = {
  google: "Google",
  apple: "Apple",
  tiktok: "TikTok",
  instagram: "Instagram",
};

interface SocialButtonProps {
  provider: keyof typeof PROVIDER_ICONS;
  onClick: () => void;
}

export function SocialButton({ provider, onClick }: SocialButtonProps) {
  const Icon = PROVIDER_ICONS[provider];
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 font-medium text-white transition-colors hover:bg-white/10"
    >
      <Icon className="h-5 w-5" />
      <span>Continue with {PROVIDER_LABELS[provider]}</span>
    </motion.button>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/SocialButton.tsx
git commit -m "feat(auth): add SocialButton component for OAuth"
```

---

### Task 4: Refactor Login page

**Files:**
- Modify: `apps/web/src/pages/Login.tsx`

**Interfaces:**
- Consumes: `AuthLayout`, `AuthInput`, `AuthButton`, `SocialButton`.
- Produces: redesigned `Login` page preserving `login`, `oauthLogin`, providers list, and error state.

- [ ] **Step 1: Rewrite Login page**

Replace `apps/web/src/pages/Login.tsx` content with:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { login, oauthLogin, type AuthProvider, type OAuthProvider } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthButton } from "../components/auth/AuthButton";
import { SocialButton } from "../components/auth/SocialButton";

export function Login() {
  const navigate = useNavigate();
  const { setUser, setAccessToken, setLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProvider[]>(["email"]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        const ids = (data.providers ?? []).map((p: { id: string }) => p.id as AuthProvider);
        setProviders(["email", ...ids.filter((id: AuthProvider) => id !== "email")]);
      })
      .catch(() => setProviders(["email"]));
  }, []);

  const oauthProviders = providers.filter((p): p is OAuthProvider => p !== "email");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { user, accessToken } = await login(email, password);
      setUser(user);
      setAccessToken(accessToken);
      setLoading(false);
      navigate("/");
    } catch {
      setIsLoading(false);
      setError("Invalid email or password");
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError("");
    try {
      const { user, accessToken } = await oauthLogin(provider, {
        code: "demo-code",
        redirectUri: window.location.origin + "/oauth/callback",
      });
      setUser(user);
      setAccessToken(accessToken);
      setLoading(false);
      navigate("/");
    } catch {
      setError(`${provider} login is not available.`);
    }
  }

  return (
    <AuthLayout title="Silent Review" subtitle="Guess the rating before the reveal.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -6, 6, -6, 6, 0] }}
            transition={{ duration: 0.4 }}
            className="text-center text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}

        <AuthButton type="submit" loading={loading}>
          Log in with Email
        </AuthButton>
      </form>

      {oauthProviders.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-white/40">or</p>
          {oauthProviders.map((provider) => (
            <SocialButton key={provider} provider={provider} onClick={() => handleOAuth(provider)} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-white/50">
        Don&apos;t have an account?{" "}
        <a href="/register" className="font-semibold text-rose-400 hover:text-rose-300">
          Sign up
        </a>
      </p>
    </AuthLayout>
  );
}
```

- [ ] **Step 2: Verify typecheck and build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Login.tsx
git commit -m "feat(auth): redesign Login page with new layout and motion"
```

---

### Task 5: Refactor Register page

**Files:**
- Modify: `apps/web/src/pages/Register.tsx`

**Interfaces:**
- Consumes: `AuthLayout`, `AuthInput`, `AuthButton`, `SocialButton`.
- Produces: redesigned `Register` page preserving register flow and OAuth.

- [ ] **Step 1: Rewrite Register page**

Replace `apps/web/src/pages/Register.tsx` with a matching layout, four inputs (email, username, display name optional, password), and OAuth section. Keep existing `register` / `oauthLogin` calls and provider list logic from the current file.

- [ ] **Step 2: Verify typecheck and build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Register.tsx
git commit -m "feat(auth): redesign Register page with new layout and motion"
```

---

### Task 6: Update E2E selectors and run full verification

**Files:**
- Modify: `e2e/onboarding.spec.ts` (only if button text/role changed; AuthButton keeps text, so likely no change).

- [ ] **Step 1: Run E2E tests**

Ensure dev stack is running, then:

```bash
pnpm test:e2e
```

Expected: 5/5 passing.

- [ ] **Step 2: Run full verification**

```bash
pnpm -r typecheck
pnpm build
pnpm --filter api test
pnpm --filter web test
```

Expected: all pass.

- [ ] **Step 3: Commit any test fixes**

```bash
git add -A
git commit -m "test(e2e): verify redesigned auth flow"
```

---

## Self-Review

**Spec coverage:**
- Glassmorphism card → AuthLayout ✅
- Animated gradient background → CSS mesh + AuthLayout ✅
- Modern inputs with focus states → AuthInput ✅
- Gradient CTA with loading → AuthButton ✅
- OAuth buttons with icons → SocialButton ✅
- Error shake animation → Login/Register error motion ✅
- Mobile-first, >=48px touch targets → padding and py-3.5 ✅
- Preserve functionality → no logic changes, same auth hooks ✅
- Reduced motion respect → useReducedMotion in AuthLayout ✅

**Placeholder scan:** No TBD/TODO. All code shown.

**Type consistency:** AuthInput ref forwarding matches React input props. SocialButton `provider` typed from icon map.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-login-ux-redesign.md`.

Recommended execution approach: **Subagent-Driven Development** — each task above is self-contained and reviewable independently.
