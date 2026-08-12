import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

const ALLOWED_PREFIXES = ["feed", "dailyDrop", "challenges"];
const DENIED_PREFIXES = ["auth", "user", "account", "profile", "followers", "following"];

function isAllowedQueryKey(queryKey: unknown): boolean {
  const first = String(Array.isArray(queryKey) ? queryKey[0] : queryKey);
  if (DENIED_PREFIXES.some((p) => first === p || first.startsWith(`${p}-`) || first.startsWith(`${p}.`))) {
    return false;
  }
  return ALLOWED_PREFIXES.some(
    (p) => first === p || first.startsWith(`${p}-`) || first.startsWith(`${p}.`)
  );
}

const idbStorage = {
  getItem: async (key: string) => {
    try {
      return await get(key);
    } catch (err) {
      console.warn("[query-persist] getItem failed:", err);
      return undefined;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await set(key, value);
    } catch (err) {
      console.warn("[query-persist] setItem failed:", err);
    }
  },
  removeItem: async (key: string) => {
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
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
});

export function shouldDehydrateQuery(query: { queryKey: unknown }): boolean {
  return isAllowedQueryKey(query.queryKey);
}
