import { prisma } from "../prisma.js";

const DEFAULT_FLAG_CACHE_TTL_MS = 30_000;

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rules: Record<string, unknown>;
}

let cache: Map<string, FeatureFlag> | null = null;
let cacheExpiresAt = 0;

async function loadFlags(): Promise<Map<string, FeatureFlag>> {
  const now = Date.now();
  if (cache && cacheExpiresAt > now) {
    return cache;
  }

  const rows = await prisma.featureFlag.findMany();
  const next = new Map<string, FeatureFlag>();
  for (const row of rows) {
    next.set(row.key, {
      key: row.key,
      enabled: row.enabled,
      rules: (row.rules as Record<string, unknown>) ?? {},
    });
  }

  cache = next;
  cacheExpiresAt = now + DEFAULT_FLAG_CACHE_TTL_MS;
  return next;
}

export async function isFeatureEnabled(
  key: string,
  context?: Record<string, unknown>
): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.get(key);
  if (!flag) return false;
  if (!flag.enabled) return false;

  const rules = flag.rules ?? {};
  if (context && rules.regions && Array.isArray(rules.regions)) {
    const region = context.region as string | undefined;
    if (region && !(rules.regions as string[]).includes(region)) {
      return false;
    }
  }

  return true;
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const flags = await loadFlags();
  return Array.from(flags.values());
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  description?: string,
  rules?: Record<string, unknown>
): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled, description, rules: (rules ?? {}) as any },
    create: { key, enabled, description, rules: (rules ?? {}) as any },
  });
  cache = null;
}

export function clearFeatureFlagCache(): void {
  cache = null;
  cacheExpiresAt = 0;
}
