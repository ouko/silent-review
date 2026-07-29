import { extname } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { env } from "../config/index.js";
import { UPLOAD_DIR, extensionForContentType, isFFmpegAvailable, isFFprobeAvailable } from "./upload-helpers.js";

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

// Frame brightness below this threshold is considered too dark / blank.
const DARK_BRIGHTNESS_THRESHOLD = 15;
// Max Hamming distance between consecutive frame hashes to treat them as identical.
const STATIC_HASH_DISTANCE_THRESHOLD = 2;

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
    const message = "ffprobe not found; video quality checks unavailable";
    console.warn(`[videoValidator] ${message}`);
    if (env.VIDEO_MODERATION_FAIL_CLOSED === "true") {
      errors.push("Video processing is temporarily unavailable");
      return {
        valid: false,
        duration: TARGET_DURATION_SECONDS,
        hasAudio: false,
        format: contentType,
        errors,
      };
    }
    // Fail open in dev: allow the upload without probing.
    return {
      valid: errors.length === 0,
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

    if (!probe.videoCodec) {
      errors.push("No video stream found");
    } else if (!ALLOWED_CODECS.has(probe.videoCodec.toLowerCase())) {
      errors.push("Unsupported video codec. Use H.264, H.265, VP8, VP9, or AV1");
    }

    const minDim = Math.min(probe.width ?? 0, probe.height ?? 0);
    if (minDim < env.VIDEO_MIN_RESOLUTION) {
      errors.push(`Video resolution is too low. Shortest side must be at least ${env.VIDEO_MIN_RESOLUTION}px`);
    }

    if (probe.fps != null && probe.fps < env.VIDEO_MIN_FPS) {
      errors.push(`Frame rate is too low. Must be at least ${env.VIDEO_MIN_FPS} fps`);
    }

    const staticOrDark = await checkStaticAndDark(buffer, ext || extensionForContentType(contentType), probe.duration);
    if (staticOrDark.error && env.VIDEO_MODERATION_FAIL_CLOSED === "true") {
      errors.push(staticOrDark.error);
    }
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
  await mkdir(UPLOAD_DIR, { recursive: true });
  const probePath = join(UPLOAD_DIR, `probe-${randomUUID()}${ext}`);
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
  error?: string;
}

async function checkStaticAndDark(buffer: Buffer, ext: string, duration: number): Promise<StaticDarkCheck> {
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    const message = "ffmpeg not found; static/dark analysis unavailable";
    console.warn(`[videoValidator] ${message}`);
    if (env.VIDEO_MODERATION_FAIL_CLOSED === "true") {
      return { isStatic: false, isDark: false, error: "Video processing is temporarily unavailable" };
    }
    return { isStatic: false, isDark: false };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const inputPath = join(UPLOAD_DIR, `check-${randomUUID()}${ext}`);
  await writeFile(inputPath, buffer);

  try {
    const sampleTimes = [0.2, Math.min(duration / 2, 2.5), Math.max(duration - 0.5, 0.5)];
    const hashes: string[] = [];
    let totalBrightness = 0;
    let sampleCount = 0;

    for (const t of sampleTimes) {
      const framePath = join(UPLOAD_DIR, `frame-${randomUUID()}.jpg`);
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
          .removeAlpha()
          .toBuffer({ resolveWithObject: true });

        hashes.push(averageHash(data, info.width, info.height));
        totalBrightness += averageBrightness(data);
        sampleCount++;
      } finally {
        await unlink(framePath).catch(() => {});
      }
    }

    const isDark = sampleCount > 0 && totalBrightness / sampleCount < DARK_BRIGHTNESS_THRESHOLD;
    const isStatic = hashes.length > 1 && hashes.every((h) => hammingDistance(h, hashes[0]) <= STATIC_HASH_DISTANCE_THRESHOLD);

    return { isStatic, isDark };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[videoValidator] frame extraction failed: ${reason}; static/dark analysis unavailable`);
    if (env.VIDEO_MODERATION_FAIL_CLOSED === "true") {
      return { isStatic: false, isDark: false, error: "Video processing is temporarily unavailable" };
    }
    return { isStatic: false, isDark: false };
  } finally {
    await unlink(inputPath).catch(() => {});
  }
}

function rgbToLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function averageHash(data: Buffer, width: number, height: number): string {
  const gray = new Array(width * height);
  let sum = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const v = rgbToLuma(r, g, b);
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
    sum += rgbToLuma(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
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
