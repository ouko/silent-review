import { QueryClient, QueryKey } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/query-core";
import { get, set, del } from "idb-keyval";

export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

const ALLOWED_PREFIXES = ["feed", "dailydrop", "challenges"] as const;
const DENIED_PREFIXES = ["auth", "user", "account", "profile", "followers", "following"] as const;

function getFirstKeySegment(queryKey: QueryKey): string | undefined {
  return Array.isArray(queryKey) && typeof queryKey[0] === "string" ? queryKey[0] : undefined;
}

function isAllowedSegment(segment: string): boolean {
  return ALLOWED_PREFIXES.some(
    (prefix) => segment === prefix || segment.startsWith(`${prefix}-`) || segment.startsWith(`${prefix}.`)
  );
}

function isDeniedSegment(segment: string): boolean {
  return DENIED_PREFIXES.some(
    (prefix) => segment === prefix || segment.startsWith(`${prefix}-`) || segment.startsWith(`${prefix}.`)
  );
}

/**
 * Determines which queries are written to the persisted IndexedDB cache.
 * Only allowlisted keys are persisted; denylisted keys are explicitly excluded
 * to avoid storing PII (profile, followers, following, etc.).
 */
export function shouldDehydrateQuery(query: Query): boolean {
  const segment = getFirstKeySegment(query.queryKey);
  if (!segment) return false;
  if (isDeniedSegment(segment)) return false;
  return isAllowedSegment(segment);
}

const idbStorage = {
  getItem: async (key: string): Promise<string | undefined> => {
    try {
      return (await get<string>(key)) ?? undefined;
    } catch (err) {
      console.warn("[query-persist] getItem failed:", err);
      return undefined;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await set(key, value);
    } catch (err) {
      console.warn("[query-persist] setItem failed:", err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await del(key);
    } catch (err) {
      console.warn("[query-persist] removeItem failed:", err);
    }
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      gcTime: CACHE_MAX_AGE_MS,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "silent-review-query-cache",
});
