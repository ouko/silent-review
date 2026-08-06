import { PrismaClient } from "@prisma/client";

function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return url;

  try {
    const parsed = new URL(url);
    // Use the IPv4 loopback to avoid any intermittent localhost resolution
    // issues on macOS Docker Desktop during high-concurrency local/e2e runs.
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }
    // Size the connection pool for the environment. Local dev/e2e runs many
    // concurrent workers (feed, analytics ingest, feature flags, auth) and
    // exhausts the default pool, so give them more headroom. Production can
    // override via DATABASE_CONNECTION_LIMIT to match its Postgres limits.
    const isProduction = process.env.NODE_ENV === "production";
    const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT
      ? parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10)
      : isProduction
        ? 20
        : 50;
    parsed.searchParams.set("connection_limit", String(connectionLimit));
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", isProduction ? "10" : "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
