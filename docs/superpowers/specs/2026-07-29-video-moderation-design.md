# Video Upload Validation and Content Moderation Design

**Date:** 2026-07-29  
**Scope:** `apps/api` upload pipeline, `apps/web` upload/create-review UX, database schema additions  
**Goal:** Enforce technical video standards (length, size, encoding, quality) and detect inappropriate/pornographic content using local frame heuristics before reviews reach the public feed.

---

## Background

The current upload flow (`apps/api/src/routes/upload.ts` → `upload.service.ts` → `localProcessor.ts`) already validates:

- File size ≤ 20 MB
- MIME type in `{video/mp4, video/webm, video/quicktime}`
- File extension in `{.mp4, .webm, .mov}`
- Duration = 5.0 s ± 0.5 s
- No audio track
- Presence of a video stream

It also produces H.264 variants and a JPEG thumbnail via `ffmpeg`. This design layers additional synchronous quality checks and asynchronous local-frame moderation on top of that flow.

---

## Requirements

### Functional

1. **Technical validation (synchronous, upload-time)**
   - Minimum resolution: 480 px on the shorter axis (i.e., min(width, height) ≥ 480).
   - Minimum frame rate: 24 fps.
   - Reject single-frame / static videos (detect via perceptual hash of sampled frames).
   - Reject all-black or all-white / extremely low-entropy videos.
   - Confirm audio absence via stream probe and, when possible, an RMS silence check on decoded audio.
   - Confirm video codec is H.264, H.265, VP8, VP9, or AV1.

2. **Content moderation (asynchronous, before publish)**
   - Sample N evenly-spread frames from the video (default: 5 frames for a 5 s clip).
   - Run local heuristics on each frame:
     - Skin-tone ratio detection (flag frames with excessive contiguous skin-colored regions).
     - Image entropy / edge density (flag extremely low or high entropy that suggests artifacts).
     - Perceptual hash similarity (flag near-duplicate frames, indicating loops or static content).
   - Aggregate frame scores into a single moderation decision: `PASS`, `REVIEW`, or `REJECT`.
   - `REJECT` blocks the review from being published; `REVIEW` quarantines it for manual inspection.

3. **User experience**
   - Upload-time failures return clear, non-technical error messages.
   - Asynchronous moderation runs after upload succeeds; the create-review form can still be filled, but the final `POST /api/reviews` is rejected if moderation failed.
   - Users whose video is rejected get a toast/inline message explaining it violated community guidelines or quality standards.

### Non-functional

- No external cloud moderation APIs (local heuristics only, per user choice).
- Must work in the existing Docker/dev stack where `ffmpeg`/`ffprobe` are available.
- Graceful degradation: if moderation binaries are missing, log a warning and allow the review (fail-open for local dev) or fail-closed in production via an env flag.
- Add ≤ 2–3 s of additional upload latency for synchronous checks; async checks should not block the upload response.

---

## Architecture

```
┌─────────────┐     POST /api/upload      ┌─────────────────────────────┐
│   Web app   │ ────────────────────────▶ │   Synchronous validator     │
│             │                           │   (size, duration, codec,   │
│             │ ◀─── {url, duration} ──── │    resolution, static,      │
└─────────────┘                           │    entropy, audio silence)  │
                                          └──────────────┬──────────────┘
                                                         │ OK
                                          ┌──────────────▼──────────────┐
                                          │   Save file + thumbnail     │
                                          └──────────────┬──────────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │   Async moderation job      │
                                          │   (sample frames, heuristics)│
                                          └──────────────┬──────────────┘
                                                         │ PASS / REJECT
                                          ┌──────────────▼──────────────┐
                                          │   Review creation gating    │
                                          │   POST /api/reviews         │
                                          └─────────────────────────────┘
```

### New / modified components

| Component | Purpose |
|-----------|---------|
| `apps/api/src/upload/videoValidator.ts` | Synchronous quality checks built on top of existing `validateVideoFile`. |
| `apps/api/src/upload/moderationEngine.ts` | Async frame extraction + heuristic scoring. |
| `apps/api/src/upload/moderationQueue.ts` | Tiny in-process queue/worker that runs moderation jobs after upload. |
| `apps/api/src/routes/upload.ts` | Wire validator and enqueue moderation job. |
| `apps/api/src/routes/reviews.ts` | Reject review creation if the uploaded video failed moderation. |
| `packages/database/prisma/schema.prisma` | Add `VideoModeration` table linked to `Review` (or to a new `UploadSession`). |
| `apps/web/src/hooks/useCreateReview.ts` / `ReviewFinalize.tsx` | Surface moderation status/errors to the user. |

---

## Data Model

Add a `VideoModeration` table:

```prisma
model VideoModeration {
  id          String            @id @default(uuid())
  reviewId    String            @unique
  review      Review            @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  status      ModerationStatus  @default(PENDING)
  score       Float?            // 0.0–1.0 aggregate risk score
  reasons     String[]          // machine-readable reason tags
  frameScores Json?             // detailed per-frame scores for debugging
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([status, updatedAt])
}

enum ModerationStatus {
  PENDING
  PASS
  REVIEW
  REJECT
}
```

`Review.status` already exists (or will be added if missing) and should be respected: a review in `PENDING_MODERATION` status is not returned by feed queries.

---

## Heuristic Details

### Frame sampling

```typescript
const FRAME_COUNT = 5;
const timestamps = Array.from({ length: FRAME_COUNT }, (_, i) =>
  Math.min(duration * ((i + 1) / (FRAME_COUNT + 1)), duration - 0.1)
);
```

Extract each frame to a small JPEG (e.g., 320 px on the long edge) using `ffmpeg`.

### Skin-tone detector

Convert frame to a small thumbnail, then to YCbCr color space. Count pixels where:

- `Cb` in `[77, 127]`
- `Cr` in `[133, 173]`
- `Y` in `[80, 220]` (exclude very dark/very bright pixels)

Compute the ratio of skin pixels to total pixels. Flag the frame if the ratio exceeds a threshold (default 0.35) **and** the skin pixels form large connected components (contour area check via OpenCV or a simple flood-fill approximation).

### Entropy / edge density

- Compute Shannon entropy of the grayscale histogram. Reject if `entropy < 2.0` (near-uniform) or `entropy > 7.5` with low edge density (noise/artifact).
- Compute Sobel edge density. Reject if edge density is near 0 (static/blur).

### Perceptual hash / duplicate detection

Compute a simple average hash (aHash) or difference hash (dHash) for each sampled frame. If the hamming distance between any two frames is below a threshold, flag the video as static/looped.

### Aggregation

```typescript
if (anyFrame === REJECT) return "REJECT";
if (anyFrame === REVIEW || avgScore > 0.6) return "REVIEW";
return "PASS";
```

---

## Error Messages

User-facing messages returned by `formatUserError`:

| Failure | Message |
|---------|---------|
| Resolution too low | "Your video is too small. Please record at least 480p." |
| Frame rate too low | "Your video frame rate is too low. Record at 24 fps or higher." |
| Static / single frame | "Your video appears to be a still image. Please upload a real video." |
| All-black / low entropy | "Your video is too dark or blank. Please re-record with good lighting." |
| Audio detected | "Silent Review videos must be silent. Please remove the audio track." |
| Moderation reject | "This video couldn't be uploaded because it may violate community guidelines." |
| Moderation review | "Your video is being reviewed. We'll let you know when it's live." |

---

## Configuration

Add environment variables:

```bash
# Sync validation
VIDEO_MIN_RESOLUTION=480
VIDEO_MIN_FPS=24
VIDEO_MAX_FILE_SIZE_MB=20

# Moderation
VIDEO_MODERATION_ENABLED=true
VIDEO_MODERATION_FRAME_COUNT=5
VIDEO_MODERATION_SKIN_THRESHOLD=0.35
VIDEO_MODERATION_FAIL_CLOSED=false   # true = reject if moderation can't run; false = allow
```

---

## Testing

- **Unit tests** for `videoValidator.ts` using small fixture videos (too short, too dark, static image, with audio, low resolution).
- **Unit tests** for `moderationEngine.ts` using synthetic frames (solid skin-color block, normal frame, dark frame).
- **E2E tests** for the upload route:
  - Upload a valid 5-second silent 720p MP4 → succeeds.
  - Upload a 5-second video with audio → fails with "must be silent".
  - Upload a static image renamed to `.mp4` → fails with "still image".
  - Upload a 240p video → fails with "too small".

---

## Open Questions / Future Work

- Should we store rejected videos for audit, or delete them immediately? (Recommended: delete immediately to save storage and reduce liability.)
- Should `REVIEW` status notify an admin or just quarantine? (Out of scope for initial pass; quarantine is sufficient.)
- Should the frame-sampling heuristic be replaced with a local ONNX model later? (Yes, as a future improvement, but not now.)

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Moderation approach | Local frame heuristics | User selected option B; avoids cloud cost/privacy concerns. |
| Sync vs async | Hybrid | Keep upload fast, but block publication until moderation passes. |
| Minimum resolution | 480 px | Matches modern phone recordings; 360 px felt too low for a review app. |
| Skin-tone threshold | 0.35 | Conservative starting point; tune with real data. |
| Fail-open vs fail-closed | Fail-open in dev, configurable in prod | Local dev may lack ffmpeg; production should likely fail-closed. |
