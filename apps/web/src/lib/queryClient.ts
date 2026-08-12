import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const idbStorage = {
  getItem: async (key: string) => get(key),
  setItem: async (key: string, value: string) => set(key, value),
  removeItem: async (key: string) => del(key),
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "silent-review-query-cache",
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
});
