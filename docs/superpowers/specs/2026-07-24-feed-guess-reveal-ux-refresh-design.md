# Feed + Guess/Reveal UX Refresh Design Spec

**Goal:** Make the Silent Review core experience feel modern, fresh, cutting-edge, and appropriate for a young, mobile-first audience.

**Scope:** This spec covers the highest-impact surfaces first:
- Home feed tabs and chrome
- Video card chrome and metadata overlay
- Guess/rating input
- Reveal screen / results card
- Loading and pull-to-refresh states

Out of scope for this phase: auth pages (already redesigned), profile page, leaderboard, viral page, record page, settings.

---

## Design Direction

**Vibe:** "Neon-glass social arcade."

Keep the existing dark foundation but add:
- **Depth** via layered glass panels, subtle shadows, and edge glow.
- **Motion** via spring animations, animated active states, and smooth transitions.
- **Cohesion** via a single reusable accent gradient (rose → pink → violet) already established in auth.
- **Youth appeal** via pill shapes, bold typography, shareable result moments, and tactile tap feedback.

---

## Visual System

### Color
- Background: `#000000` (unchanged)
- Surface glass: `bg-white/10` with `backdrop-blur-xl`
- Accent gradient: `from-rose-500 via-pink-500 to-violet-500`
- Success: `emerald-400`
- Warning: `amber-400`
- Error: `rose-400`
- Text primary: `white`
- Text secondary: `white/60`
- Text muted: `white/40`

### Typography
- Use the existing system font stack but apply heavier weights and tighter tracking for headers.
- Tab labels: `font-bold tracking-tight`
- Card metadata: `text-sm font-medium`
- Score/rating numerals: `font-black tracking-tighter`

### Shape
- Cards and major containers: `rounded-3xl`
- Pills and buttons: `rounded-full` or `rounded-2xl`
- Touch targets: minimum `48px` (unchanged)

### Motion
- Entrance: `opacity` + `y` translate, 0.35s ease-out
- Tap: `whileTap={{ scale: 0.95 }}` or `0.92` for larger targets
- Focus/select: spring scale `1.05` with glow ring
- Page transitions: `AnimatePresence` slide/fade
- Respect `prefers-reduced-motion` everywhere

---

## Components

### 1. Home Feed Tabs

Replace the plain text tab row with a pill-shaped segmented control.

```
[ For You | Following | Trending ]
        ^ animated active pill
```

- Container: `rounded-full bg-white/5 border border-white/10 p-1`
- Active indicator: `rounded-full bg-white/15` with layout-id animation via Framer Motion.
- Inactive text: `text-white/50`
- Active text: `text-white font-bold`

### 2. Video Card Chrome

Each video card should feel like a framed, glowing piece of content.

- Outer frame: `rounded-3xl overflow-hidden` with subtle `shadow-2xl shadow-rose-500/5`
- Edge glow on active/hover: `ring-2 ring-rose-500/20`
- Metadata overlay: cleaner bottom sheet with avatar, username, product tag, and caption.
- Product tag: small glass pill with gradient border.

### 3. Rating Input (GuessButtons)

Replace the 10 separate red/yellow/green circles with a cohesive 1–10 scale.

**Option A (recommended):** Horizontal segmented bar.
- Track: `rounded-full bg-white/10 h-14`
- Segments: split into 10 equal cells with rounded ends.
- Selected segment: gradient fill + glow.
- Numbers: bold white centered in each segment.
- Haptic + spring animation on tap.

**Option B:** Arc/radial dial (future enhancement, more complex).

For this phase, implement Option A to keep scope tight.

### 4. Reveal Screen

Transform the reveal into a celebratory, shareable moment.

- Large animated actual rating with scale-spring entrance.
- Circular score ring around the user’s guess accuracy.
- "Result card" preview with gradient border, ready for future share screenshot.
- "Play again" CTA: full-width gradient pill button.
- Staggered entrance animation for rating, feedback, stats, and CTA.

### 5. Loading / Pull-to-Refresh

- Replace spinner with a branded pulsing logo or gradient shimmer.
- Pull-to-refresh indicator: circular gradient spinner with "Release" text.

---

## Data Flow

No backend changes. All existing hooks (`useFeed`, `useGuess`, `useVideoFeed`) remain unchanged. Components receive the same props and emit the same events.

## Error Handling

Preserve existing error states. Add subtle motion to error messages (shake or fade-in) without changing behavior.

## Accessibility

- Maintain existing aria labels.
- Respect `prefers-reduced-motion` by disabling entrance/scale animations.
- Ensure all touch targets remain >= 48px.

## Testing

- Update E2E selectors only if element text/roles change.
- Run `pnpm --filter web typecheck`, `pnpm --filter web build`, `pnpm test:e2e`.

## Success Criteria

- [ ] Typecheck passes.
- [ ] Production build passes.
- [ ] All existing E2E tests pass.
- [ ] UI visibly feels more polished on mobile (Pixel 5 viewport) and desktop.
- [ ] No new runtime dependencies.
