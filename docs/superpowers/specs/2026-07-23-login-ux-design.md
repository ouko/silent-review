# Login / Onboarding UX Design

## Goal

Modernize the Silent Review login and registration screens to feel premium, trustworthy, and mobile-native — the first impression for new users.

## Current State

- `apps/web/src/pages/Login.tsx` and `Register.tsx` use a plain stacked form on a black background.
- Inputs and buttons are functional but lack visual hierarchy, motion, and polish.
- OAuth providers are text-only buttons.
- No progress indication during submission.

## Proposed Design

### Visual Direction

- **Glassmorphism card**: a frosted, semi-transparent panel (`bg-white/10 backdrop-blur-xl border border-white/10`) floating on a subtle animated gradient mesh background.
- **Typography**: large bold headline, clear subheadline, generous whitespace.
- **Inputs**: rounded-2xl, subtle inner glow on focus, clear placeholder labels.
- **Primary CTA**: full-width gradient button (rose → pink → violet) with press-scale animation.
- **OAuth buttons**: icon + label, outlined style, consistent sizing.
- **Error states**: inline message with shake animation on invalid submission.
- **Loading state**: spinner in the CTA, disabled inputs.

### Interactions

- Entrance: card fades/slides up on load (Framer Motion).
- Focus: inputs scale slightly and glow.
- Submit: button shows spinner, form fields disabled.
- Error: card shakes horizontally.
- OAuth hover/tap: buttons brighten and scale down.

### Mobile-First

- Full-height layout; card centered with safe-area padding.
- Touch targets >= 48px.
- Keyboard-aware spacing not required for static forms.

### Accessibility

- Proper label association and focus rings.
- Reduced-motion respect via `useReducedMotion`.
- Color contrast maintained on dark background.

## Files to Change

- `apps/web/src/pages/Login.tsx`
- `apps/web/src/pages/Register.tsx`
- `apps/web/src/index.css` (add utility classes if needed)
- Add `lucide-react` icons already available in the project.

## Success Criteria

- Login and register screens look visually distinct and modern.
- All existing functionality preserved (form validation, OAuth, error handling).
- Animations feel responsive, not annoying (< 400ms).
- No layout breakage on mobile viewport (375px+).

## Out of Scope

- Backend changes.
- New auth providers.
- Deep onboarding flow beyond login/register.
