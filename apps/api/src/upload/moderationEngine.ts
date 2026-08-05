import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "../config/index.js";
import { isFFmpegAvailable } from "./upload-helpers.js";

const execFileAsync = promisify(execFile);

function moderateWithDegradation(message: string): ModerationResult {
  console.warn(`[moderationEngine] ${message}`);
  const failClosed = env.VIDEO_MODERATION_FAIL_CLOSED === "true";
  return {
    status: failClosed ? "REJECT" : "PASS",
    score: failClosed ? 1 : 0,
    reasons: [`${message} (fail-${failClosed ? "closed" : "open"})`],
    frameScores: [],
  };
}

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
  if (duration <= 0) {
    return { status: "REJECT", score: 1, reasons: ["Invalid video duration"], frameScores: [] };
  }

  const frameCount = env.VIDEO_MODERATION_FRAME_COUNT;
  if (frameCount <= 0) {
    return { status: "PASS", score: 0, reasons: [], frameScores: [] };
  }

  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    return moderateWithDegradation("ffmpeg not found; video moderation unavailable");
  }

  const frameScores: FrameScore[] = [];
  try {
    for (let i = 0; i < frameCount; i++) {
      const t = Math.min((duration * (i + 1)) / (frameCount + 1), duration - 0.1);
      const score = await analyzeFrame(videoPath, t);
      frameScores.push(score);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return moderateWithDegradation(`Frame analysis failed: ${reason}`);
  }

  if (frameScores.length === 0) {
    return moderateWithDegradation("No frames could be analyzed");
  }

  const reasons: string[] = [];
  let reject = false;
  let review = false;

  // Skin-tone policy: a person recording themselves (exactly what this app
  // is for) will have a face in frame, which must NOT reject. Only reject
  // when the video is predominantly skin-toned across the sampled frames
  // (the explicit-content pattern), controlled by
  // VIDEO_MODERATION_SKIN_THRESHOLD (average ratio, default 0.6).
  const skinThreshold = env.VIDEO_MODERATION_SKIN_THRESHOLD;
  const avgSkin = frameScores.reduce((sum, s) => sum + s.skinRatio, 0) / frameScores.length;
  if (avgSkin > skinThreshold) {
    reasons.push(
      `Video is predominantly skin-toned throughout (avg ${(avgSkin * 100).toFixed(0)}% skin pixels across frames)`
    );
    reject = true;
  }

  for (const score of frameScores) {
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
      .removeAlpha()
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
