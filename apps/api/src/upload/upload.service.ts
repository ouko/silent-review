import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { extname, join } from "path";
import { UPLOAD_DIR, UPLOAD_BASE_URL, extensionForContentType } from "./upload-helpers.js";
import { encryptAtRest } from "./storageCrypto.js";

const execFileAsync = promisify(execFile);

export { validateVideoFile, stripAudioTrack, rectifyVideo, TARGET_DURATION_SECONDS, type VideoValidationResult } from "./videoValidator.js";

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
  let data = buffer;
  let finalExt = ext;

  // macOS dev environments often receive QuickTime .mov files from iPhones.
  // Safari and other browsers play MP4 far more reliably, so transcode .mov
  // to H.264 MP4 when avconvert is available (ships with macOS).
  if (ext.toLowerCase() === ".mov" && (await isAvconvertAvailable())) {
    const tmpMov = join(UPLOAD_DIR, `transcode-${id}.mov`);
    const tmpMp4 = join(UPLOAD_DIR, `transcode-${id}.mp4`);
    await writeFile(tmpMov, buffer);
    try {
      if (await transcodeMovToMp4(tmpMov, tmpMp4)) {
        data = await readFile(tmpMp4);
        finalExt = ".mp4";
      }
    } finally {
      await unlink(tmpMov).catch(() => {});
      await unlink(tmpMp4).catch(() => {});
    }
  }

  // Encrypt at rest when UPLOAD_ENCRYPTION_KEY is configured.
  const filename = `${id}${finalExt}`;
  await writeFile(join(UPLOAD_DIR, filename), encryptAtRest(data));

  return `${UPLOAD_BASE_URL}/${filename}`;
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
