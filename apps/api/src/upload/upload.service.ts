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

export { validateVideoFile, type VideoValidationResult } from "./videoValidator.js";

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

export async function saveVideoFile(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const id = randomUUID();
  const ext = extname(originalName) || extensionForContentType(contentType);
  let filename = `${id}${ext}`;
  let filepath = join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);

  // macOS dev environments often receive QuickTime .mov files from iPhones.
  // Safari and other browsers play MP4 far more reliably, so transcode .mov
  // to H.264 MP4 when avconvert is available (ships with macOS).
  if (ext.toLowerCase() === ".mov" && (await isAvconvertAvailable())) {
    const mp4Filename = `${id}.mp4`;
    const mp4Path = join(UPLOAD_DIR, mp4Filename);
    const transcoded = await transcodeMovToMp4(filepath, mp4Path);
    if (transcoded) {
      await unlink(filepath).catch(() => {});
      filename = mp4Filename;
    }
  }

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

export async function isFFprobeAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffprobe", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function isAvconvertAvailable(): Promise<boolean> {
  if (process.platform !== "darwin") return false;
  try {
    // avconvert itself exits non-zero for --help, so just check it is on PATH.
    await execFileAsync("bash", ["-c", "command -v avconvert"]);
    return true;
  } catch {
    return false;
  }
}

async function transcodeMovToMp4(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    await execFileAsync("avconvert", [
      "-s",
      inputPath,
      "-o",
      outputPath,
      "-p",
      "Preset1280x720",
      "--replace",
    ]);
    return true;
  } catch {
    return false;
  }
}
