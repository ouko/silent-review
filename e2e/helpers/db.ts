import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(__dirname, "db-runner.ts");
const repoRoot = path.resolve(__dirname, "../..");

export interface StreakState {
  streakDays?: number;
  freezeHeld?: number;
  lastActiveAt?: Date;
  lastFreezeEarnedAt?: Date;
}

export function setUserStreakState(userId: string, state: StreakState): void {
  execFileSync(
    "pnpm",
    [
      "exec",
      "dotenv",
      "-e",
      ".env",
      "--",
      "pnpm",
      "--filter",
      "@silent-review/database",
      "exec",
      "tsx",
      runnerPath,
      JSON.stringify({
        userId,
        streakDays: state.streakDays,
        freezeHeld: state.freezeHeld,
        lastActiveAt: state.lastActiveAt?.toISOString(),
        lastFreezeEarnedAt: state.lastFreezeEarnedAt?.toISOString(),
      }),
    ],
    { cwd: repoRoot, stdio: "pipe" }
  );
}
