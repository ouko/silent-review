import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only load the local .env file when the caller has not already provided a
// database URL (e.g. GitHub Actions sets DATABASE_URL explicitly). This keeps
// local `pnpm test` working while avoiding overriding CI environment variables.
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: resolve(__dirname, "../../../.env") });
}
