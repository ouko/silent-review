import { spawnSync } from "child_process";

const result = spawnSync(
  "pnpm",
  ["--filter", "api", "exec", "tsx", "scripts/curate-launch-content.mts"],
  {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: "inherit",
    shell: false,
  }
);

process.exit(result.status ?? 1);
