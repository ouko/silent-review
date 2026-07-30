import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const UPLOAD_DIR = join(__dirname, "../../../../uploads");
export const UPLOAD_BASE_URL = "/uploads";

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
