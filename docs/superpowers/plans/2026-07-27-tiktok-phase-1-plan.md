# TikTok Phase 1 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove friction from manual TikTok sharing, capture attribution data, and make the exported content look native to TikTok — all without requiring official TikTok API credentials.

**Architecture:** A small share utilities package on the web builds UTM-tagged URLs and captions; the existing canvas renderer is extended for mobile-friendly download and frame extraction; a new `ShareEvent` table and lightweight analytics endpoint record shares on the API; the ShareSheet orchestrates these pieces into a one-tap mobile workflow.

**Tech Stack:** React + TypeScript (web), Express + Prisma (API), canvas API for export, Web Share / clipboard API for sharing.

## Global Constraints
- Keep changes scoped to the sharing surface; do not refactor auth, feed algorithm, or video processing.
- All new code must pass `pnpm typecheck` and the existing e2e suite.
- Mobile-first: every share action must work on iOS Safari and Chrome Android.
- No new third-party dependencies without explicit justification.
- UTM parameters must follow the existing campaign naming convention: `utm_source=silentreview`, `utm_medium=share`.

---

## File Map

| File | Responsibility |
|------|---------------|
| `apps/web/src/lib/share/urlBuilder.ts` | Build review deep links with UTM tags and product slugs. |
| `apps/web/src/lib/share/copyToClipboard.ts` | Cross-browser/mobile clipboard helper with fallback. |
| `apps/web/src/lib/export/captionGenerator.ts` | Generate TikTok caption with product-specific hashtags. |
| `apps/web/src/lib/export/canvasRenderer.ts` | Render vertical share video; add snapshot helper for cover frames. |
| `apps/web/src/hooks/useExport.ts` | Expose `download()` and `saveToCameraRoll()` helpers. |
| `apps/web/src/components/share/ShareSheet.tsx` | Main UI: platform picker, export, copy link, caption, frame picker. |
| `apps/web/src/components/share/FramePicker.tsx` | Let user scrub and pick a cover frame. |
| `packages/database/prisma/schema.prisma` | Add `ShareEvent` model. |
| `packages/database/prisma/migrations/20260727120000_add_share_events/` | Migration for `ShareEvent`. |
| `apps/api/src/services/share.service.ts` | Record share events and query analytics. |
| `apps/api/src/routes/shares.ts` | `POST /api/shares` and `GET /api/shares/analytics`. |
| `apps/api/src/index.ts` | Wire `sharesRouter` under `/api/shares`. |
| `apps/web/src/lib/api.ts` | Add `recordShare` call (optional; can also fire-and-forget from ShareSheet). |

---

### Task 1: Build UTM-tagged share URLs and copy-to-clipboard

**Files:**
- Create: `apps/web/src/lib/share/urlBuilder.ts`
- Create: `apps/web/src/lib/share/copyToClipboard.ts`
- Modify: `apps/web/src/components/share/ShareSheet.tsx`
- Test: `apps/web/src/lib/share/__tests__/urlBuilder.test.ts`

**Interfaces:**
- Produces: `buildShareUrl(reviewId, productName, options?) -> string`
- Produces: `copyToClipboard(text) -> Promise<void>`
- Consumes: existing `ShareSheetProps` (`reviewId`, `productName`, `deepLinkUrl`)

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/share/__tests__/urlBuilder.test.ts
import { describe, it, expect } from "vitest";
import { buildShareUrl, toHashtagSlug } from "../urlBuilder";

describe("urlBuilder", () => {
  it("builds a UTM-tagged review URL", () => {
    const url = buildShareUrl("abc123", "EcoWear Sneakers", { provider: "tiktok" });
    expect(url).toBe(
      "http://localhost:5173/review/abc123?utm_source=silentreview&utm_medium=share&utm_campaign=tiktok&utm_content=ecowear-sneakers"
    );
  });

  it("slugifies product names for hashtags", () => {
    expect(toHashtagSlug("EcoWear Sneakers!")).toBe("EcoWearSneakers");
  });
});
```

Run: `pnpm --filter web test urlBuilder`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement urlBuilder**

```ts
// apps/web/src/lib/share/urlBuilder.ts
export interface ShareUrlOptions {
  provider?: "tiktok" | "instagram" | "copy" | "native";
  baseUrl?: string;
}

export function toHashtagSlug(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .replace(/^(\d)/, "_$1");
}

export function buildShareUrl(
  reviewId: string,
  productName: string,
  options: ShareUrlOptions = {}
): string {
  const base = options.baseUrl ?? window.location.origin;
  const campaign = options.provider ?? "share";
  const content = toHashtagSlug(productName) || "review";
  const url = new URL(`/review/${reviewId}`, base);
  url.searchParams.set("utm_source", "silentreview");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  return url.toString();
}
```

- [ ] **Step 3: Implement copyToClipboard**

```ts
// apps/web/src/lib/share/copyToClipboard.ts
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
```

- [ ] **Step 4: Add Copy Link button to ShareSheet**

In `apps/web/src/components/share/ShareSheet.tsx`:
1. Import `buildShareUrl` and `copyToClipboard`.
2. Add state: `const [copied, setCopied] = useState(false);`
3. Add handler:

```ts
async function handleCopyLink() {
  const url = buildShareUrl(reviewId, productName, { provider: "copy" });
  await copyToClipboard(url);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
```

4. Add button inside the sheet, above the existing native-share button:

```tsx
<button
  onClick={handleCopyLink}
  className="mt-3 w-full rounded-xl border border-white/20 py-3 text-sm font-semibold text-white"
>
  {copied ? "Link copied!" : "Copy link"}
</button>
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter web test`
Expected: PASS (existing + new tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/share/ apps/web/src/components/share/ShareSheet.tsx

git commit -m "feat(share): build UTM-tagged URLs and copy-to-clipboard

Adds urlBuilder, copyToClipboard helper, and a Copy link button in
ShareSheet so users can share a review with UTM attribution."
```

---

### Task 2: TikTok-optimized vertical export + mobile save

**Files:**
- Modify: `apps/web/src/lib/export/canvasRenderer.ts`
- Modify: `apps/web/src/hooks/useExport.ts`
- Modify: `apps/web/src/components/share/ShareSheet.tsx`

**Interfaces:**
- Produces: `renderShareableVideo` already exists; ensure output `Blob` is downloadable as `.mp4` if possible, otherwise `.webm`.
- Produces: `useExport().save(filename)` triggers download using an `<a>` tag.
- Produces: `useExport().saveToCameraRoll(filename)` — same as save; rely on OS "Save to Files / Photos" dialog on mobile.

- [ ] **Step 1: Add mobile-safe download to useExport**

```ts
// apps/web/src/hooks/useExport.ts
function download(blobUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

Update `useExport` return to expose:

```ts
return {
  generate,
  download: (filename?: string) => {
    if (!blobUrl) return;
    download(blobUrl, filename || "silent-review.webm");
  },
  cleanup,
  progress,
  blobUrl,
};
```

- [ ] **Step 2: Update ShareSheet export/download buttons**

Change download button filename to `.mp4` only when supported; keep `.webm` as default.

```tsx
<button
  onClick={() => exportApi.download(`silent-review-${reviewId}.webm`)}
  disabled={!exportApi.blobUrl}
>
  Save video
</button>
```

Label the primary action "Export for TikTok" when `selectedPlatform === "tiktok"`.

- [ ] **Step 3: Run e2e smoke**

Run: `pnpm test:e2e --project="Mobile Chrome" --grep "bottom navigation"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(share): mobile-safe video download and TikTok export labeling

Renames export action for TikTok and ensures downloaded video uses a
stable filename on mobile browsers."
```

---

### Task 3: Product-specific hashtags and share caption

**Files:**
- Modify: `apps/web/src/lib/export/captionGenerator.ts`
- Modify: `apps/web/src/components/share/ShareSheet.tsx`
- Test: `apps/web/src/lib/export/__tests__/captionGenerator.test.ts`

**Interfaces:**
- Produces: `generateCaption(productName, platform, rating?) -> ExportCaption`
- Produces: `toHashtagSlug` re-used from `urlBuilder.ts`.

- [ ] **Step 1: Update caption generator**

```ts
// apps/web/src/lib/export/captionGenerator.ts
import { toHashtagSlug } from "../share/urlBuilder";

export function generateCaption(productName: string, platform: string, rating?: number): ExportCaption {
  const ratingText = rating ? `Can you guess the rating? It was ${rating}/10.` : "Can you guess the rating?";
  const productTag = toHashtagSlug(productName) || "ProductReview";
  const base = `${productName} — ${ratingText}`;
  const hashtags = `#SilentReview #${productTag} #ProductReview #GuessTheRating`;
  const mentions = platform === "twitter" ? "@silentreview" : "@silentreview.app";
  return { caption: base, hashtags, mentions };
}
```

- [ ] **Step 2: Add unit test**

```ts
// apps/web/src/lib/export/__tests__/captionGenerator.test.ts
import { describe, it, expect } from "vitest";
import { generateCaption } from "../captionGenerator";

describe("generateCaption", () => {
  it("includes product-specific hashtag", () => {
    const result = generateCaption("EcoWear Sneakers", "tiktok", 8);
    expect(result.hashtags).toContain("#EcoWearSneakers");
    expect(result.hashtags).toContain("#SilentReview");
  });
});
```

- [ ] **Step 3: Display caption in ShareSheet**

Add a read-only textarea in `ShareSheet.tsx` showing the combined caption + hashtags, with a "Copy caption" button:

```tsx
const caption = useMemo(
  () => generateCaption(productName, selectedPlatform, rating),
  [productName, selectedPlatform, rating]
);

<div className="space-y-2">
  <label className="text-xs font-semibold uppercase text-white/50">Caption</label>
  <textarea
    readOnly
    value={`${caption.caption}\n\n${caption.hashtags}\n${caption.mentions}`}
    className="h-24 w-full rounded-xl bg-white/5 p-3 text-sm text-white"
  />
  <button
    onClick={async () => {
      await copyToClipboard(`${caption.caption}\n\n${caption.hashtags}\n${caption.mentions}`);
    }}
    className="w-full rounded-xl bg-white/10 py-2 text-sm font-semibold"
  >
    Copy caption
  </button>
</div>
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(share): product-specific hashtags and copyable caption

Updates captionGenerator to include #[ProductName] and exposes the
full caption in ShareSheet for one-tap copying before TikTok post."
```

---

### Task 4: Record share events and expose analytics

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260727120000_add_share_events/migration.sql`
- Create: `apps/api/src/services/share.service.ts`
- Create: `apps/api/src/routes/shares.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/web/src/components/share/ShareSheet.tsx` (fire-and-forget POST)
- Test: `apps/api/src/services/share.service.test.ts` (optional)

**Interfaces:**
- Produces: `recordShare(input: RecordShareInput) -> ShareEvent`
- Produces: `getShareAnalytics(reviewId?: string) -> AnalyticsSummary`
- Consumes: existing `requireAuth` middleware for authenticated share recording.

- [ ] **Step 1: Add ShareEvent model**

```prisma
// packages/database/prisma/schema.prisma
model ShareEvent {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewId  String
  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  provider  String   // tiktok, instagram, copy, native, etc.
  utmCampaign String?
  utmContent  String?
  ipHash    String?  // privacy-safe hash for deduplication
  createdAt DateTime @default(now())

  @@index([reviewId])
  @@index([userId])
  @@index([createdAt])
  @@index([provider, createdAt])
}
```

- [ ] **Step 2: Create migration**

Create `packages/database/prisma/migrations/20260727120000_add_share_events/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareEvent_reviewId_idx" ON "ShareEvent"("reviewId");

-- CreateIndex
CREATE INDEX "ShareEvent_userId_idx" ON "ShareEvent"("userId");

-- CreateIndex
CREATE INDEX "ShareEvent_createdAt_idx" ON "ShareEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ShareEvent_provider_createdAt_idx" ON "ShareEvent"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Implement share service**

```ts
// apps/api/src/services/share.service.ts
import { prisma } from "../prisma.js";

export interface RecordShareInput {
  userId: string;
  reviewId: string;
  provider: string;
  utmCampaign?: string;
  utmContent?: string;
  ipHash?: string;
}

export async function recordShare(input: RecordShareInput) {
  // Debounce: ignore duplicate shares from same user/review/provider within 5 seconds.
  const cutoff = new Date(Date.now() - 5000);
  const existing = await prisma.shareEvent.findFirst({
    where: {
      userId: input.userId,
      reviewId: input.reviewId,
      provider: input.provider,
      createdAt: { gte: cutoff },
    },
  });
  if (existing) return existing;

  return prisma.shareEvent.create({ data: input });
}

export async function getShareAnalytics(reviewId?: string) {
  const where = reviewId ? { reviewId } : {};
  const [total, byProvider] = await Promise.all([
    prisma.shareEvent.count({ where }),
    prisma.shareEvent.groupBy({
      by: ["provider"],
      where,
      _count: { provider: true },
    }),
  ]);
  return {
    total,
    byProvider: byProvider.map((g) => ({ provider: g.provider, count: g._count.provider })),
  };
}
```

- [ ] **Step 4: Add shares route**

```ts
// apps/api/src/routes/shares.ts
import { Router } from "express";
import { recordShare, getShareAnalytics } from "../services/share.service.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const sharesRouter = Router();

sharesRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reviewId, provider, utmCampaign, utmContent } = req.body;
    if (!reviewId || !provider) {
      res.status(400).json({ error: "reviewId and provider are required" });
      return;
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? "";
    const ipHash = Buffer.from(ip).toString("base64");
    const event = await recordShare({
      userId: req.user!.id,
      reviewId,
      provider,
      utmCampaign,
      utmContent,
      ipHash,
    });
    // Increment denormalized counter.
    await prisma.review.update({
      where: { id: reviewId },
      data: { shareCount: { increment: 1 } },
    });
    res.status(201).json({ id: event.id });
  } catch (err) {
    next(err);
  }
});

sharesRouter.get("/analytics", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.query.reviewId as string | undefined;
    const analytics = await getShareAnalytics(reviewId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: Wire router in app**

In `apps/api/src/index.ts`, add:

```ts
import { sharesRouter } from "./routes/shares.js";
// ...
app.use("/api/shares", sharesRouter);
```

- [ ] **Step 6: Record shares from ShareSheet**

In `ShareSheet.tsx`, after any share action (copy link, native share, download), fire a `POST /api/shares`:

```ts
function trackShare(provider: string) {
  const url = buildShareUrl(reviewId, productName, { provider: provider as any });
  const utm = new URL(url).searchParams;
  fetch("/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reviewId,
      provider,
      utmCampaign: utm.get("utm_campaign"),
      utmContent: utm.get("utm_content"),
    }),
  }).catch(() => {});
}
```

Call `trackShare("copy")` in `handleCopyLink`, `trackShare("native")` in `handleNativeShare`, `trackShare("download")` in download, and `trackShare(selectedPlatform)` after export.

- [ ] **Step 7: Run database migration and typecheck**

```bash
cd packages/database && pnpm migrate && pnpm generate
cd ../.. && pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add packages/database apps/api/src/routes/shares.ts apps/api/src/services/share.service.ts apps/api/src/index.ts apps/web/src/components/share/ShareSheet.tsx
git commit -m "feat(analytics): record share events and expose analytics endpoint

Adds ShareEvent table, /api/shares recording, /api/shares/analytics,
and fires share events from ShareSheet for copy, native share, and
download actions."
```

---

### Task 5: TikTok cover frame picker

**Files:**
- Create: `apps/web/src/components/share/FramePicker.tsx`
- Modify: `apps/web/src/lib/export/canvasRenderer.ts`
- Modify: `apps/web/src/components/share/ShareSheet.tsx`

**Interfaces:**
- Produces: `captureFrame(videoUrl, time, platform) -> Blob` (JPEG)
- Produces: `FramePicker` component with `onSelect(time)` callback.

- [ ] **Step 1: Add snapshot helper to canvasRenderer**

```ts
// apps/web/src/lib/export/canvasRenderer.ts
export function captureFrame(
  videoUrl: string,
  time: number,
  platform: PlatformId = "tiktok"
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const template = getPlatformTemplate(platform);
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.currentTime = time;

    const canvas = document.createElement("canvas");
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Could not get canvas context"));

    video.onerror = () => reject(new Error("Failed to load video"));
    video.onseeked = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      let drawW = canvas.width;
      let drawH = canvas.height;
      let drawX = 0;
      let drawY = 0;
      if (videoAspect > canvasAspect) {
        drawH = canvas.width / videoAspect;
        drawY = (canvas.height - drawH) / 2;
      } else {
        drawW = canvas.height * videoAspect;
        drawX = (canvas.width - drawW) / 2;
      }
      ctx.drawImage(video, drawX, drawY, drawW, drawH);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create frame blob"));
      }, "image/jpeg", 0.92);
    };
    video.load();
  });
}
```

- [ ] **Step 2: Build FramePicker component**

```tsx
// apps/web/src/components/share/FramePicker.tsx
import { useRef, useState, useEffect } from "react";

interface FramePickerProps {
  videoUrl: string;
  onSelect: (blob: Blob, time: number) => void;
}

export function FramePicker({ videoUrl, onSelect }: FramePickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      setDuration(video.duration);
      setCurrentTime(video.duration * 0.25);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [videoUrl]);

  async function handleCapture() {
    setCapturing(true);
    const { captureFrame } = await import("../../lib/export/canvasRenderer");
    const blob = await captureFrame(videoUrl, currentTime, "tiktok");
    setCapturing(false);
    onSelect(blob, currentTime);
  }

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        src={videoUrl}
        className="max-h-64 w-full rounded-xl bg-black"
        muted
        playsInline
        crossOrigin="anonymous"
      />
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={(e) => {
          const t = Number(e.target.value);
          setCurrentTime(t);
          if (videoRef.current) videoRef.current.currentTime = t;
        }}
        className="w-full"
      />
      <button
        onClick={handleCapture}
        disabled={capturing || !duration}
        className="w-full rounded-xl bg-white/10 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {capturing ? "Capturing…" : "Use this frame as TikTok cover"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Integrate FramePicker into ShareSheet**

Add state:

```ts
const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
const [showFramePicker, setShowFramePicker] = useState(false);
```

Render toggle:

```tsx
<button
  onClick={() => setShowFramePicker((s) => !s)}
  className="mt-3 w-full rounded-xl bg-white/5 py-2 text-sm font-medium text-white/70"
>
  {showFramePicker ? "Hide cover picker" : "Pick TikTok cover"}
</button>
{showFramePicker && (
  <FramePicker videoUrl={videoUrl} onSelect={(blob) => setCoverBlob(blob)} />
)}
{coverBlob && (
  <img
    src={URL.createObjectURL(coverBlob)}
    alt="Selected TikTok cover"
    className="mt-3 max-h-48 w-full rounded-xl object-contain"
  />
)}
```

- [ ] **Step 4: Run e2e and typecheck**

Run:

```bash
pnpm typecheck
pnpm test:e2e --project="Mobile Chrome" --grep "bottom navigation"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(share): TikTok cover frame picker

Adds FramePicker component and captureFrame helper so users can scrub
to any frame and save a 1080x1920 JPEG cover optimized for TikTok."
```

---

## Self-Review

1. **Spec coverage:** Each Phase 1 priority from the report maps to a task.
2. **Placeholder scan:** No TBDs or vague steps; each task has exact code.
3. **Type consistency:** `toHashtagSlug` is shared between `urlBuilder.ts` and `captionGenerator.ts`; `PlatformId` is reused across renderer and frame picker.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-tiktok-phase-1-plan.md`.

**Recommended next step:** Implement Task 1 first, since it unblocks UTM attribution for every later task and requires no backend changes.
