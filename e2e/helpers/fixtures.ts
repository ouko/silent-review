import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

export interface GenerateVideoFixtureOptions {
  duration?: number;
  width?: number;
  height?: number;
  filter?: string;
  audio?: boolean;
}

export async function generateVideoFixture(
  name: string,
  opts: GenerateVideoFixtureOptions = {}
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
  ];
  if (audio) {
    args.push("-f", "lavfi", "-i", `sine=frequency=1000:duration=${duration}`);
  }
  args.push(
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-t", String(duration),
    "-y"
  );
  if (audio) {
    args.push("-c:a", "aac", "-b:a", "128k");
  } else {
    args.push("-an");
  }
  args.push(output);

  await execFileAsync("ffmpeg", args);
  return output;
}
