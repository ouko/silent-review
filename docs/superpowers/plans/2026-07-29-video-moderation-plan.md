# Video Validation and Content Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add synchronous video quality/encoding validation and asynchronous local-frame content moderation to the upload pipeline, blocking inappropriate or low-quality reviews before they reach the feed.

**Architecture:** Extend `apps/api/src/upload` with two new modules (`videoValidator.ts` for sync checks, `moderationEngine.ts` for async frame heuristics) and a tiny in-process queue (`moderationQueue.ts`). Upload runs sync validation inline, saves the file, then enqueues moderation. Review creation reads the resulting `VideoModeration` row and rejects/fails if status is `REJECT`. The `Review.status` field is reused to hide pending reviews from feeds.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, PostgreSQL, ffmpeg/ffprobe, sharp (for frame analysis), React/TanStack Query on the web.

## Global Constraints

- No external cloud moderation APIs (local heuristics only).
- Must work in the existing Docker/dev stack where `ffmpeg`/`ffprobe` are available.
- Graceful degradation: if moderation binaries are missing, log a warning and allow the review in dev (`VIDEO_MODERATION_FAIL_CLOSED=false`) or reject in production.
- Add ≤ 2–3 s of additional upload latency for synchronous checks; async checks must not block the upload response.
- User-facing error messages must be professional and non-technical (reuse `formatUserError`).
- All new code must have unit/E2E tests; E2E tests must not rely on external services.

---

## Task 1: Database Migration — Add VideoModeration Table

**Files:**
- Create: `packages/database/prisma/migrations/20260729120000_add_video_moderation/migration.sql`
- Modify: `packages/database/prisma/schema.prisma`
- Test: existing migration commands (`pnpm --filter database run deploy`)

**Interfaces:**
- Consumes: existing `Review` model.
- Produces: `VideoModeration` Prisma model and `ModerationStatus` enum.

- [ ] **Step 1: Add model and enum to schema**

Append to `packages/database/prisma/schema.prisma` (after the `Review` model):

```prisma
model VideoModeration {
  id          String            @id @default(uuid())
  reviewId    String            @unique
  review      Review            @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  status      ModerationStatus  @default(PENDING)
  score       Float?
  reasons     String[]
  frameScores Json?
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

- [ ] **Step 2: Generate migration SQL**

Run:

```bash
cd packages/database
pnpm exec prisma migrate dev --name add_video_moderation
```

Expected: migration file created and applied to local dev database.

- [ ] **Step 3: Regenerate Prisma client and build database package**

Run:

```bash
pnpm exec dotenv -e .env -- pnpm --filter database generate
pnpm --filter database build
```

Expected: `packages/database/dist` updated, TypeScript types available.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations
pnpm --filter database build
git add packages/database/dist
git commit -m "feat(db): add VideoModeration table for upload moderation"
```

---

## Task 2: Configuration — Add Moderation Env Vars

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `.env.example`
- Test: `pnpm --filter api typecheck`

**Interfaces:**
- Consumes: none.
- Produces: `env.VIDEO_MODERATION_ENABLED`, `env.VIDEO_MIN_RESOLUTION`, `env.VIDEO_MIN_FPS`, `env.VIDEO_MODERATION_FRAME_COUNT`, `env.VIDEO_MODERATION_SKIN_THRESHOLD`, `env.VIDEO_MODERATION_FAIL_CLOSED`.

- [ ] **Step 1: Extend env schema**

Edit `apps/api/src/config/env.ts`, add after `WEB_APP_URL`:

```typescript
  VIDEO_MODERATION_ENABLED: z.string().default("true"),
  VIDEO_MIN_RESOLUTION: z.coerce.number().default(480),
  VIDEO_MIN_FPS: z.coerce.number().default(24),
  VIDEO_MODERATION_FRAME_COUNT: z.coerce.number().default(5),
  VIDEO_MODERATION_SKIN_THRESHOLD: z.coerce.number().default(0.35),
  VIDEO_MODERATION_FAIL_CLOSED: z.string().default("false"),
```

- [ ] **Step 2: Update .env.example**

Append to `.env.example`:

```bash
# Video validation and moderation
VIDEO_MODERATION_ENABLED=true
VIDEO_MIN_RESOLUTION=480
VIDEO_MIN_FPS=24
VIDEO_MODERATION_FRAME_COUNT=5
VIDEO_MODERATION_SKIN_THRESHOLD=0.35
VIDEO_MODERATION_FAIL_CLOSED=false
```

- [ ] **Step 3: Typecheck**

Run:

```bash
pnpm --filter api typecheck
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/config/env.ts .env.example
git commit -m "feat(api): add video moderation environment variables"
```

---

## Task 3: Synchronous Video Validator

**Files:**
- Create: `apps/api/src/upload/videoValidator.ts`
- Create: `apps/api/src/upload/__tests__/videoValidator.test.ts`
- Modify: `apps/api/src/upload/upload.service.ts`
- Test: `pnpm --filter api test -- videoValidator`

**Interfaces:**
- Consumes: `env`, `VideoProbe` from `upload.service.ts`.
- Produces: `validateVideoFile` enhanced with quality checks; new exported types `VideoValidationResult` extended with `width`, `height`, `fps`, `codec`.

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/upload/__tests__/videoValidator.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import { validateVideoFile } from "../videoValidator.js";

// These tests assume ffmpeg/ffprobe are installed. In CI they are present.
// Use small fixture files committed under apps/api/src/upload/__tests__/fixtures.

describe("validateVideoFile", () => {
  it("accepts a valid 5s silent 720p mp4", async () => {
    const buffer = await fixtureBuffer("valid-720p.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "valid-720p.mp4");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a video below min resolution", async () => {
    const buffer = await fixtureBuffer("240p.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "240p.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("480"))).toBe(true);
  });

  it("rejects a video with audio", async () => {
    const buffer = await fixtureBuffer("with-audio.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "with-audio.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("silent"))).toBe(true);
  });

  it("rejects a static image", async () => {
    const buffer = await fixtureBuffer("static-frame.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "static-frame.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("still"))).toBe(true);
  });

  it("rejects a video that is too dark", async () => {
    const buffer = await fixtureBuffer("black.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "black.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("dark"))).toBe(true);
  });
});

async function fixtureBuffer(name: string): Promise<Buffer> {
  const { readFile } = await import("fs/promises");
  const { join } = await import("path");
  return readFile(join(__dirname, "fixtures", name));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/api
node --experimental-vm-modules node_modules/jest/bin/jest.js src/upload/__tests__/videoValidator.test.ts
```

Expected: FAIL — `videoValidator.ts` does not exist.

- [ ] **Step 3: Implement videoValidator.ts**

Create `apps/api/src/upload/videoValidator.ts`:

```typescript
import { extname } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { env } from "../config/index.js";

const execFileAsync = promisify(execFile);

export interface VideoValidationResult {
  valid: boolean;
  duration: number;
  hasAudio: boolean;
  format: string;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  errors: string[];
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const TARGET_DURATION_SECONDS = 5.0;
const DURATION_TOLERANCE_SECONDS = 0.5;
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_CODECS = new Set(["h264", "hevc", "vp8", "vp9", "av1"]);

export async function validateVideoFile(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<VideoValidationResult> {
  const errors: string[] = [];

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit`);
  }

  if (!ALLOWED_VIDEO_MIME_TYPES.includes(contentType)) {
    errors.push(`Format ${contentType} is not allowed. Use MP4 (H.264), WebM, or MOV`);
  }

  const ext = extname(originalName).toLowerCase();
  if (![".mp4", ".webm", ".mov"].includes(ext)) {
    errors.push("File extension must be .mp4, .webm, or .mov");
  }

  let probe: VideoProbe | null = null;
  const ffprobeAvailable = await isFFprobeAvailable();
  if (!ffprobeAvailable) {
    errors.push("Video processing is temporarily unavailable");
    return {
      valid: false,
      duration: TARGET_DURATION_SECONDS,
      hasAudio: false,
      format: contentType,
      errors,
    };
  }

  try {
    probe = await probeVideo(buffer, ext || extensionForContentType(contentType));
  } catch (err) {
    errors.push(`Could not probe video: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (probe) {
    if (Math.abs(probe.duration - TARGET_DURATION_SECONDS) > DURATION_TOLERANCE_SECONDS) {
      errors.push(
        `Duration must be ${TARGET_DURATION_SECONDS}s ± ${DURATION_TOLERANCE_SECONDS}s (got ${probe.duration.toFixed(2)}s)`
      );
    }

    if (probe.hasAudio) {
      errors.push("Audio track detected. Silent Review videos must be silent");
    }

    if (!probe.videoCodec || !ALLOWED_CODECS.has(probe.videoCodec.toLowerCase())) {
      errors.push("Unsupported video codec. Use H.264, H.265, VP8, VP9, or AV1");
    }

    const minDim = Math.min(probe.width ?? 0, probe.height ?? 0);
    if (minDim < env.VIDEO_MIN_RESOLUTION) {
      errors.push(`Video resolution is too low. Shortest side must be at least ${env.VIDEO_MIN_RESOLUTION}px`);
    }

    if (probe.fps && probe.fps < env.VIDEO_MIN_FPS) {
      errors.push(`Frame rate is too low. Must be at least ${env.VIDEO_MIN_FPS} fps`);
    }

    const staticOrDark = await checkStaticAndDark(buffer, ext || extensionForContentType(contentType), probe.duration);
    if (staticOrDark.isStatic) {
      errors.push("Video appears to be a still image. Please upload a real video");
    }
    if (staticOrDark.isDark) {
      errors.push("Video is too dark or blank. Please re-record with good lighting");
    }
  } else {
    errors.push("No video stream found");
  }

  return {
    valid: errors.length === 0,
    duration: probe?.duration ?? 0,
    hasAudio: probe?.hasAudio ?? false,
    format: contentType,
    width: probe?.width,
    height: probe?.height,
    fps: probe?.fps,
    codec: probe?.videoCodec,
    errors,
  };
}

interface VideoProbe {
  duration: number;
  hasAudio: boolean;
  videoCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
}

async function probeVideo(buffer: Buffer, ext: string): Promise<VideoProbe> {
  const uploadDir = join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const probePath = join(uploadDir, `probe-${randomUUID()}${ext}`);
  await writeFile(probePath, buffer);

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      probePath,
    ]);

    const data = JSON.parse(stdout);
    const videoStream = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === "video");
    const audioStream = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === "audio");

    const fps = videoStream?.r_frame_rate
      ? parseRational(videoStream.r_frame_rate)
      : undefined;

    return {
      duration: parseFloat(data.format?.duration ?? "0") || 0,
      hasAudio: Boolean(audioStream),
      videoCodec: videoStream?.codec_name,
      width: videoStream?.width,
      height: videoStream?.height,
      fps,
    };
  } finally {
    await unlink(probePath).catch(() => {});
  }
}

function parseRational(rational: string): number | undefined {
  const [num, den] = rational.split("/").map(Number);
  if (!den || Number.isNaN(num)) return undefined;
  return num / den;
}

interface StaticDarkCheck {
  isStatic: boolean;
  isDark: boolean;
}

async function checkStaticAndDark(buffer: Buffer, ext: string, duration: number): Promise<StaticDarkCheck> {
  const uploadDir = join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const inputPath = join(uploadDir, `check-${randomUUID()}${ext}`);
  await writeFile(inputPath, buffer);

  try {
    const sampleTimes = [0.2, Math.min(duration / 2, 2.5), Math.max(duration - 0.5, 0.5)];
    const hashes: string[] = [];
    let totalBrightness = 0;
    let sampleCount = 0;

    for (const t of sampleTimes) {
      const framePath = join(uploadDir, `frame-${randomUUID()}.jpg`);
      try {
        await execFileAsync("ffmpeg", [
          "-ss", String(t),
          "-i", inputPath,
          "-vframes", "1",
          "-q:v", "5",
          "-s", "64x64",
          "-f", "image2",
          framePath,
        ]);

        const { default: sharp } = await import("sharp");
        const { data, info } = await sharp(framePath)
          .raw()
          .ensureAlpha(false)
          .toBuffer({ resolveWithObject: true });

        hashes.push(averageHash(data, info.width, info.height));
        totalBrightness += averageBrightness(data);
        sampleCount++;
      } finally {
        await unlink(framePath).catch(() => {});
      }
    }

    const isDark = sampleCount > 0 && totalBrightness / sampleCount < 15;
    const isStatic = hashes.length > 1 && hashes.every((h) => hammingDistance(h, hashes[0]) <= 2);

    return { isStatic, isDark };
  } finally {
    await unlink(inputPath).catch(() => {});
  }
}

function averageHash(data: Buffer, width: number, height: number): string {
  const gray = new Array(width * height);
  let sum = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = v;
    sum += v;
  }
  const avg = sum / gray.length;
  return gray.map((v) => (v >= avg ? "1" : "0")).join("");
}

function averageBrightness(data: Buffer): number {
  let sum = 0;
  const count = data.length / 3;
  for (let i = 0; i < count; i++) {
    sum += 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
  }
  return sum / count;
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

async function isFFprobeAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffprobe", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "video/webm":
      return ".webm";
    case "video/mp4":
      return ".mp4";
    case "video/quicktime":
      return ".mov";
    default:
      return ".bin";
  }
}
```

- [ ] **Step 4: Update upload.service.ts to delegate to videoValidator**

Replace the body of `validateVideoFile` in `apps/api/src/upload/upload.service.ts` with a re-export:

```typescript
export { validateVideoFile, type VideoValidationResult } from "./videoValidator.js";
```

Remove the old `VideoValidationResult` interface and `validateVideoFile` implementation from `upload.service.ts`, keeping `saveVideoFile`, `isFFmpegAvailable`, `isFFprobeAvailable`, `UPLOAD_DIR`, `UPLOAD_BASE_URL`, and helpers.

- [ ] **Step 5: Install sharp dependency**

Run:

```bash
pnpm --filter api add sharp
pnpm --filter api add -D @types/sharp
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd apps/api
node --experimental-vm-modules node_modules/jest/bin/jest.js src/upload/__tests__/videoValidator.test.ts
```

Expected: tests pass (requires fixture files; if fixtures are missing, generate them with ffmpeg commands in a setup script).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/upload apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): synchronous video quality/encoding validator"
```

---

## Task 4: Asynchronous Moderation Engine

**Files:**
- Create: `apps/api/src/upload/moderationEngine.ts`
- Create: `apps/api/src/upload/__tests__/moderationEngine.test.ts`
- Test: `pnpm --filter api test -- moderationEngine`

**Interfaces:**
- Consumes: `env`, ffmpeg, sharp.
- Produces: `ModerationResult { status: ModerationStatus; score: number; reasons: string[]; frameScores: unknown[] }` and `runVideoModeration(videoPath: string, duration: number): Promise<ModerationResult>`.

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/upload/__tests__/moderationEngine.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import { runVideoModeration } from "../moderationEngine.js";
import { writeFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

describe("runVideoModeration", () => {
  it("passes a normal talking-head style silent video", async () => {
    const path = await createFixture("valid", 5, "color=c=#336699:s=640x480:d=5");
    const result = await runVideoModeration(path, 5);
    expect(result.status).toBe("PASS");
    await unlink(path);
  });

  it("rejects a video that is mostly skin-toned", async () => {
    const path = await createFixture("skin", 5, "color=c=#e0ac69:s=640x480:d=5");
    const result = await runVideoModeration(path, 5);
    expect(result.status).toBe("REJECT");
    expect(result.reasons.some((r) => r.includes("skin"))).toBe(true);
    await unlink(path);
  });

  it("rejects a completely black video", async () => {
    const path = await createFixture("black", 5, "color=c=black:s=640x480:d=5");
    const result = await runVideoModeration(path, 5);
    expect(result.status).toBe("REJECT");
    await unlink(path);
  });

  it("flags a static image video for review", async () => {
    const path = await createFixture("static", 5, "color=c=#448844:s=640x480:d=5");
    const result = await runVideoModeration(path, 5);
    expect(["REJECT", "REVIEW"]).toContain(result.status);
    await unlink(path);
  });
});

async function createFixture(name: string, duration: number, filter: string): Promise<string> {
  const output = `/tmp/moderation-test-${name}-${Date.now()}.mp4`;
  await execFileAsync("ffmpeg", [
    "-f", "lavfi",
    "-i", filter,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-t", String(duration),
    "-an",
    "-y",
    output,
  ]);
  return output;
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/api
node --experimental-vm-modules node_modules/jest/bin/jest.js src/upload/__tests__/moderationEngine.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement moderationEngine.ts**

Create `apps/api/src/upload/moderationEngine.ts`:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "../config/index.js";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = join(__dirname, "../../../../uploads");

export type ModerationStatus = "PENDING" | "PASS" | "REVIEW" | "REJECT";

export interface ModerationResult {
  status: ModerationStatus;
  score: number;
  reasons: string[];
  frameScores: FrameScore[];
}

interface FrameScore {
  time: number;
  skinRatio: number;
  entropy: number;
  edgeDensity: number;
  hash: string;
}

export async function runVideoModeration(videoPath: string, duration: number): Promise<ModerationResult> {
  const frameCount = env.VIDEO_MODERATION_FRAME_COUNT;
  const frameScores: FrameScore[] = [];

  for (let i = 0; i < frameCount; i++) {
    const t = Math.min((duration * (i + 1)) / (frameCount + 1), duration - 0.1);
    const score = await analyzeFrame(videoPath, t);
    frameScores.push(score);
  }

  const reasons: string[] = [];
  let reject = false;
  let review = false;

  const skinThreshold = env.VIDEO_MODERATION_SKIN_THRESHOLD;
  for (const score of frameScores) {
    if (score.skinRatio > skinThreshold) {
      reasons.push(`Excessive skin tone detected at ${score.time.toFixed(2)}s`);
      reject = true;
    }
    if (score.entropy < 2.0) {
      reasons.push(`Very low entropy at ${score.time.toFixed(2)}s`);
      reject = true;
    }
    if (score.edgeDensity < 0.01) {
      reasons.push(`No edges detected at ${score.time.toFixed(2)}s`);
      review = true;
    }
  }

  const hashes = frameScores.map((s) => s.hash);
  const allSame = hashes.length > 1 && hashes.every((h) => hammingDistance(h, hashes[0]) <= 2);
  if (allSame) {
    reasons.push("Video frames are nearly identical");
    review = true;
  }

  const avgSkin = frameScores.reduce((sum, s) => sum + s.skinRatio, 0) / frameScores.length;
  const avgEntropy = frameScores.reduce((sum, s) => sum + s.entropy, 0) / frameScores.length;
  const score = Math.min(1, Math.max(0, avgSkin * 2 + (8 - avgEntropy) / 8));

  let status: ModerationStatus = "PASS";
  if (reject) status = "REJECT";
  else if (review || score > 0.6) status = "REVIEW";

  return { status, score, reasons, frameScores };
}

async function analyzeFrame(videoPath: string, time: number): Promise<FrameScore> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const framePath = join(UPLOAD_DIR, `mod-frame-${randomUUID()}.jpg`);

  try {
    await execFileAsync("ffmpeg", [
      "-ss", String(time),
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "5",
      "-s", "320x240",
      "-f", "image2",
      framePath,
    ]);

    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(framePath)
      .raw()
      .ensureAlpha(false)
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const skinRatio = computeSkinRatio(data, width, height);
    const entropy = computeEntropy(data, width, height);
    const edgeDensity = computeEdgeDensity(data, width, height);
    const hash = averageHash(data, width, height);

    return { time, skinRatio, entropy, edgeDensity, hash };
  } finally {
    await unlink(framePath).catch(() => {});
  }
}

function computeSkinRatio(data: Buffer, width: number, height: number): number {
  let skinPixels = 0;
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (y >= 80 && y <= 220 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
      skinPixels++;
    }
  }
  return skinPixels / total;
}

function computeEntropy(data: Buffer, width: number, height: number): number {
  const hist = new Array(256).fill(0);
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const gray = Math.round(0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]);
    hist[gray]++;
  }
  let entropy = 0;
  for (const count of hist) {
    if (count === 0) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function computeEdgeDensity(data: Buffer, width: number, height: number): number {
  const gray: number[] = [];
  for (let i = 0; i < width * height; i++) {
    gray.push(0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]);
  }

  let edges = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      if (Math.sqrt(gx * gx + gy * gy) > 30) edges++;
    }
  }
  return edges / (width * height);
}

function averageHash(data: Buffer, width: number, height: number): string {
  const gray: number[] = [];
  let sum = 0;
  for (let i = 0; i < width * height; i++) {
    const v = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
    gray.push(v);
    sum += v;
  }
  const avg = sum / gray.length;
  return gray.map((v) => (v >= avg ? "1" : "0")).join("");
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd apps/api
node --experimental-vm-modules node_modules/jest/bin/jest.js src/upload/__tests__/moderationEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/upload apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): local-frame video moderation engine"
```

---

## Task 5: Moderation Queue and Upload Route Integration

**Files:**
- Create: `apps/api/src/upload/moderationQueue.ts`
- Modify: `apps/api/src/routes/upload.ts`
- Modify: `apps/api/src/app.ts` (optional shutdown hook)
- Test: `pnpm --filter api test` + E2E upload tests

**Interfaces:**
- Consumes: `runVideoModeration`, Prisma `VideoModeration`.
- Produces: `enqueueModeration(videoPath: string, duration: number, reviewId?: string): void` and `processQueue(): Promise<void>`.

- [ ] **Step 1: Implement moderationQueue.ts**

Create `apps/api/src/upload/moderationQueue.ts`:

```typescript
import { prisma } from "../prisma.js";
import { env } from "../config/index.js";
import { runVideoModeration, type ModerationResult } from "./moderationEngine.js";

interface QueueItem {
  videoPath: string;
  duration: number;
  reviewId?: string;
}

const queue: QueueItem[] = [];
let processing = false;

export function enqueueModeration(videoPath: string, duration: number, reviewId?: string): void {
  if (env.VIDEO_MODERATION_ENABLED !== "true") return;
  queue.push({ videoPath, duration, reviewId });
  void processQueue();
}

export async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    await runModeration(item);
  }

  processing = false;
}

async function runModeration(item: QueueItem): Promise<void> {
  try {
    const result = await runVideoModeration(item.videoPath, item.duration);

    if (item.reviewId) {
      await prisma.videoModeration.create({
        data: {
          reviewId: item.reviewId,
          status: result.status,
          score: result.score,
          reasons: result.reasons,
          frameScores: result.frameScores as any,
        },
      });

      if (result.status === "REJECT") {
        await prisma.review.update({
          where: { id: item.reviewId },
          data: { status: "HIDDEN" },
        });
      }
    }
  } catch (err) {
    const failClosed = env.VIDEO_MODERATION_FAIL_CLOSED === "true";
    if (item.reviewId && failClosed) {
      await prisma.videoModeration.create({
        data: {
          reviewId: item.reviewId,
          status: "REJECT",
          reasons: ["Moderation could not be completed"],
        },
      });
      await prisma.review.update({
        where: { id: item.reviewId },
        data: { status: "HIDDEN" },
      });
    }
    console.error("Moderation failed", err);
  }
}
```

- [ ] **Step 2: Wire queue into upload route**

Modify `apps/api/src/routes/upload.ts`:

```typescript
import { enqueueModeration } from "../upload/moderationQueue.js";
```

After `saveVideoFile` resolves to `originalUrl`, add:

```typescript
    // Enqueue async moderation using the saved file path.
    const absolutePath = join(UPLOAD_DIR, originalUrl.replace(UPLOAD_BASE_URL, ""));
    enqueueModeration(absolutePath, validation.duration);
```

Import `join` from `path` if not already imported.

- [ ] **Step 3: Typecheck and run API tests**

Run:

```bash
pnpm --filter api typecheck
pnpm --filter api test
```

Expected: typecheck passes; existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/upload.ts apps/api/src/upload/moderationQueue.ts
git commit -m "feat(api): enqueue async moderation after upload"
```

---

## Task 6: Gate Review Creation by Moderation Status

**Files:**
- Modify: `apps/api/src/reviews/reviews.service.ts`
- Modify: `apps/api/src/reviews/reviews.routes.ts`
- Test: `pnpm --filter api test` + E2E create-review tests

**Interfaces:**
- Consumes: `VideoModeration` row for the video URL.
- Produces: `createReview` rejects with a clear error if moderation status is `REJECT`.

- [ ] **Step 1: Modify createReview to check moderation**

Edit `apps/api/src/reviews/reviews.service.ts`. At the top of `createReview`, after duplicate detection, add:

```typescript
  const moderation = await prisma.videoModeration.findFirst({
    where: { review: { videoUrl: input.videoUrl } },
    orderBy: { createdAt: "desc" },
  });

  if (moderation?.status === "REJECT") {
    throw new Error("Video moderation failed: content violates community guidelines");
  }
```

Also, when creating a new review, set initial status to `UNDER_REVIEW` if a matching `VideoModeration` row exists and is `PENDING`:

```typescript
  const initialStatus = moderation?.status === "PENDING" ? "UNDER_REVIEW" : "PUBLISHED";

  const review = await prisma.review.create({
    data: { ...input, userId, status: initialStatus },
    ...
  });
```

Update the duplicate-edit branch to also set status based on moderation:

```typescript
        status: moderation?.status === "REJECT" ? "HIDDEN" : moderation?.status === "PENDING" ? "UNDER_REVIEW" : "PUBLISHED",
```

- [ ] **Step 2: Update feed queries to exclude non-published reviews**

Verify `apps/api/src/feed/feed.service.ts` already filters by `status: "PUBLISHED"`. If not, add the filter.

- [ ] **Step 3: Add friendly error mapping in web errors helper**

Edit `apps/web/src/lib/errors.ts`, add to `KNOWN_MESSAGES`:

```typescript
  ["Video moderation failed", "This video couldn't be uploaded because it may violate community guidelines."],
  ["content violates community guidelines", "This video couldn't be uploaded because it may violate community guidelines."],
```

- [ ] **Step 4: Typecheck and test**

Run:

```bash
pnpm typecheck
pnpm --filter api test
pnpm --filter web test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/reviews apps/web/src/lib/errors.ts
git commit -m "feat(api): gate review creation on video moderation status"
```

---

## Task 7: Frontend — Surface Moderation Status

**Files:**
- Modify: `apps/web/src/hooks/useCreateReview.ts`
- Modify: `apps/web/src/components/create/ReviewFinalize.tsx` (or wherever the create button lives)
- Test: manual + E2E

**Interfaces:**
- Consumes: existing `useUpload` and `useCreateReview` hooks.
- Produces: `useCreateReview` exposes an `isModerating` state while async moderation runs; final submission blocked/rejected based on API response.

- [ ] **Step 1: Add polling for moderation status in useCreateReview**

Modify `apps/web/src/hooks/useCreateReview.ts`:

```typescript
import { useState } from "react";
```

Add inside the hook:

```typescript
  const [moderationError, setModerationError] = useState<string | null>(null);
```

After successful upload, poll `/api/reviews/moderation?videoUrl=...` until moderation is no longer `PENDING`:

```typescript
// Inside mutationFn after uploadResult is available, before POST /api/reviews
const moderation = await waitForModeration(uploadResult.url);
if (moderation?.status === "REJECT") {
  throw new Error("This video couldn't be uploaded because it may violate community guidelines.");
}
```

Add helper function in the same file:

```typescript
async function waitForModeration(videoUrl: string, maxAttempts = 30): Promise<{ status: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { data } = await api.get(`/api/reviews/moderation?videoUrl=${encodeURIComponent(videoUrl)}`);
      if (data.status !== "PENDING") return data;
    } catch {
      return null;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}
```

- [ ] **Step 2: Add moderation status route**

Edit `apps/api/src/reviews/reviews.routes.ts`, add:

```typescript
reviewsRouter.get("/moderation", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const videoUrl = req.query.videoUrl as string;
    if (!videoUrl) {
      res.status(400).json({ error: "Missing videoUrl" });
      return;
    }

    const moderation = await prisma.videoModeration.findFirst({
      where: { review: { videoUrl } },
      orderBy: { createdAt: "desc" },
      select: { status: true, reasons: true, score: true },
    });

    if (!moderation) {
      res.json({ status: "PENDING", reasons: [], score: null });
      return;
    }

    res.json(moderation);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Typecheck and test**

Run:

```bash
pnpm typecheck
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useCreateReview.ts apps/api/src/reviews/reviews.routes.ts
git commit -m "feat(web): poll video moderation status before creating review"
```

---

## Task 8: End-to-End Tests

**Files:**
- Create: `e2e/video-moderation.spec.ts`
- Modify: `e2e/helpers/fixtures.ts` (create if needed)
- Test: `PLAYWRIGHT_BASE_URL=http://172.20.10.5:5173 pnpm test:e2e e2e/video-moderation.spec.ts`

**Interfaces:**
- Consumes: existing `registerFreshUser` helper.
- Produces: passing E2E tests for valid upload, audio rejection, low-resolution rejection, and moderation rejection.

- [ ] **Step 1: Create fixture generation helper**

Create `e2e/helpers/fixtures.ts`:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

export async function generateVideoFixture(
  name: string,
  opts: {
    duration?: number;
    width?: number;
    height?: number;
    filter?: string;
    audio?: boolean;
  } = {}
): Promise<string> {
  const {
    duration = 5,
    width = 640,
    height = 480,
    filter = `color=c=#336699:s=${width}x${height}:d=${duration}`,
    audio = false,
  } = opts;

  const output = join(tmpdir(), `e2e-${name}-${Date.now()}.mp4`);
  const args = [
    "-f", "lavfi",
    "-i", filter,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-t", String(duration),
    "-y",
  ];
  if (!audio) args.push("-an");
  args.push(output);

  await execFileAsync("ffmpeg", args);
  return output;
}
```

- [ ] **Step 2: Write E2E spec**

Create `e2e/video-moderation.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";
import { generateVideoFixture } from "./helpers/fixtures";

test.describe("video moderation", () => {
  test("valid silent 720p video uploads successfully", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("valid", { width: 1280, height: 720 });

    await page.goto("/record");
    await page.setInputFiles('input[type="file"]', videoPath);
    await expect(page.getByText(/Uploading/i)).not.toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/continue/i)).toBeVisible({ timeout: 30000 });
  });

  test("video with audio is rejected", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("with-audio", { audio: true });

    await page.goto("/record");
    await page.setInputFiles('input[type="file"]', videoPath);
    await expect(page.getByText(/must be silent/i)).toBeVisible({ timeout: 30000 });
  });

  test("240p video is rejected for low resolution", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("lowres", { width: 320, height: 240 });

    await page.goto("/record");
    await page.setInputFiles('input[type="file"]', videoPath);
    await expect(page.getByText(/too small/i)).toBeVisible({ timeout: 30000 });
  });

  test("mostly skin-toned video is rejected by moderation", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("skin", {
      filter: "color=c=#e0ac69:s=640x480:d=5",
    });

    await page.goto("/record");
    await page.setInputFiles('input[type="file"]', videoPath);
    await expect(page.getByText(/community guidelines/i)).toBeVisible({ timeout: 60000 });
  });
});
```

- [ ] **Step 3: Run E2E tests**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://172.20.10.5:5173 pnpm test:e2e e2e/video-moderation.spec.ts --workers=1
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test(e2e): video validation and moderation flows"
```

---

## Task 9: Documentation and Final Verification

**Files:**
- Modify: `AUDIT_REPORT.md` or `docs/TESTING.md` (add mention of moderation)
- Test: full suite (`pnpm typecheck && pnpm test && pnpm test:e2e --workers=1`)

- [ ] **Step 1: Update AUDIT_REPORT.md**

Add a new section under `## 11. Production-Readiness Round`:

```markdown
### 11.12 Video validation and content moderation
- **Files:** `apps/api/src/upload/videoValidator.ts`, `apps/api/src/upload/moderationEngine.ts`, `apps/api/src/upload/moderationQueue.ts`, `apps/api/src/reviews/reviews.service.ts`, `apps/web/src/hooks/useCreateReview.ts`
- **Issue:** Uploaded videos were only checked for duration, size, and silence. There was no enforcement of resolution/frame-rate/encoding quality and no local content moderation.
- **Status:** Fixed.
- **Fix:** Added synchronous validation for min 480p resolution, 24 fps, allowed codecs, static-frame detection, and brightness. Added asynchronous local-frame moderation using skin-tone, entropy, edge-density, and perceptual-hash heuristics. Review creation is gated on moderation status; rejected videos are hidden from feeds.
```

Update section 13.1 with the latest test counts.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm typecheck
pnpm --filter api test
pnpm --filter web test
PLAYWRIGHT_BASE_URL=http://172.20.10.5:5173 pnpm test:e2e --workers=1
```

Expected: all green.

- [ ] **Step 3: Commit and push**

```bash
git add AUDIT_REPORT.md docs
pnpm --filter shared build
git add packages/shared/dist
git commit -m "docs: document video validation and moderation implementation"
git push origin main
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Sync quality checks (resolution, fps, codec, static, dark) → Task 3.
   - Async moderation (skin-tone, entropy, edge, hash) → Task 4.
   - Queue integration → Task 5.
   - Review creation gating → Task 6.
   - Frontend polling → Task 7.
   - Tests → Tasks 3, 4, 8.
   - Docs → Task 9.

2. **Placeholder scan:** no TBD/TODO/fill-in details; all code and commands are explicit.

3. **Type consistency:** `ModerationStatus` string union used in engine matches Prisma enum values (`PASS`, `REJECT`, `REVIEW`, `PENDING`). `VideoValidationResult` extends existing shape with new optional fields.
