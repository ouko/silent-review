import { spawnSync } from "child_process";

const result = spawnSync(
  "pnpm",
  ["--filter", "database", "exec", "tsx", "scripts/audit-feature-flags.mts"],
  {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: "inherit",
    shell: false,
  }
);

process.exit(result.status ?? 1);
