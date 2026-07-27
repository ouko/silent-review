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
    // Force a larger connection pool for local dev/e2e so concurrent requests
    // (feature-flag checks, auth, feed) don't exhaust the default pool.
    parsed.searchParams.set("connection_limit", "20");
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "10");
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
