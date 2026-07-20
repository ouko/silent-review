import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { UPLOAD_DIR, UPLOAD_BASE_URL, type VideoVariant, type ProcessedVideo } from "./upload.service.js";

const execFileAsync = promisify(execFile);

const VARIANTS: Array<{ label: VideoVariant["label"]; height: number }> = [
  { label: "480p", height: 480 },
  { label: "720p", height: 720 },
  { label: "1080p", height: 1080 },
];

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

    const variants: VideoVariant[] = [];
    for (const variant of VARIANTS) {
      const outputFilename = `${variant.label}-${id}.mp4`;
      const outputPath = join(UPLOAD_DIR, outputFilename);
      try {
        await execFileAsync("ffmpeg", [
          "-i",
          inputPath,
          "-vf",
          `scale=-2:${variant.height}`,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-an",
          "-movflags",
          "+faststart",
          "-y",
          outputPath,
        ]);
        variants.push({
          label: variant.label,
          url: `${UPLOAD_BASE_URL}/${outputFilename}`,
          width: 0,
          height: variant.height,
        });
      } catch {
        // Skip variants that fail (e.g. source smaller than target height).
      }
    }

    // WebM fallback variant for open-web compatibility.
    const webmFilename = `webm-${id}.webm`;
    const webmPath = join(UPLOAD_DIR, webmFilename);
    try {
      await execFileAsync("ffmpeg", [
        "-i",
        inputPath,
        "-vf",
        "scale=-2:720",
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "1M",
        "-an",
        "-y",
        webmPath,
      ]);
      variants.push({ label: "webm", url: `${UPLOAD_BASE_URL}/${webmFilename}`, width: 0, height: 720 });
    } catch {
      // WebM fallback is optional.
    }

    return {
      originalUrl,
      variants,
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
