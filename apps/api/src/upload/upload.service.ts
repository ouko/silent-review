import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { extname, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const UPLOAD_DIR = join(__dirname, "../../../../uploads");
export const UPLOAD_BASE_URL = "/uploads";

export interface VideoValidationResult {
  valid: boolean;
  duration: number;
  hasAudio: boolean;
  format: string;
  width?: number;
  height?: number;
  errors: string[];
}

export interface ProcessedVideo {
  originalUrl: string;
  variants: VideoVariant[];
  thumbnailUrl: string | null;
  duration: number;
}

export interface VideoVariant {
  label: "480p" | "720p" | "1080p" | "webm";
  url: string;
  width: number;
  height: number;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const TARGET_DURATION_SECONDS = 5.0;
const DURATION_TOLERANCE_SECONDS = 0.5;
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

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
    }
  }

  return {
    valid: errors.length === 0,
    duration: probe?.duration ?? 0,
    hasAudio: probe?.hasAudio ?? false,
    format: contentType,
    width: probe?.width,
    height: probe?.height,
    errors,
  };
}

interface VideoProbe {
  duration: number;
  hasAudio: boolean;
  videoCodec?: string;
  width?: number;
  height?: number;
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

    return {
      duration: parseFloat(data.format?.duration ?? "0") || 0,
      hasAudio: Boolean(audioStream),
      videoCodec: videoStream?.codec_name,
      width: videoStream?.width,
      height: videoStream?.height,
    };
  } finally {
    await unlink(probePath).catch(() => {});
  }
}

export async function saveVideoFile(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const id = randomUUID();
  const ext = extname(originalName) || extensionForContentType(contentType);
  const filename = `${id}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);

  return `${UPLOAD_BASE_URL}/${filename}`;
}

export function extensionForContentType(contentType: string): string {
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

export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}
