import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { UPLOAD_DIR, UPLOAD_BASE_URL } from "./upload-helpers.js";
import { encryptAtRest, isEncryptionEnabled } from "./storageCrypto.js";
import { type ProcessedVideo } from "./upload.service.js";

const execFileAsync = promisify(execFile);

export async function processVideoLocally(originalUrl: string, buffer: Buffer): Promise<ProcessedVideo> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const id = randomUUID();
  const inputPath = join(UPLOAD_DIR, `input-${id}.webm`);
  await writeFile(inputPath, buffer);

  try {
    // Probe duration so we can extract thumbnail at 2.5s.
    const duration = await probeDuration(inputPath);
    const thumbnailTime = Math.min(duration / 2, 2.5);
    const thumbnailFilename = `thumb-${id}.jpg`;
    const thumbnailPath = join(UPLOAD_DIR, thumbnailFilename);

    await execFileAsync("ffmpeg", [
      "-i",
      inputPath,
      "-ss",
      String(thumbnailTime),
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbnailPath,
    ]);

    // Encrypt the stored thumbnail at rest when a key is configured.
    if (isEncryptionEnabled()) {
      const encrypted = encryptAtRest(await readFile(thumbnailPath));
      await writeFile(thumbnailPath, encrypted);
    }

    // Variants are generated asynchronously by the moderation queue so the
    // upload response is not blocked by slow transcoding.
    return {
      originalUrl,
      variants: [],
      thumbnailUrl: `${UPLOAD_BASE_URL}/${thumbnailFilename}`,
      duration,
    };
  } finally {
    await unlink(inputPath).catch(() => {});
  }
}

async function probeDuration(inputPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    return parseFloat(stdout.trim()) || 5;
  } catch {
    return 5;
  }
}
