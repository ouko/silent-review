import { api } from "./api";

/**
 * Fire-and-forget video engagement events. Deduped per review per page
 * session: a video counts at most one view and one completion until reload.
 */
const fired = new Set<string>();

export function trackVideoEvent(reviewId: string, type: "view" | "complete"): void {
  const key = `${reviewId}:${type}`;
  if (fired.has(key)) return;
  fired.add(key);
  api.post("/api/views", { reviewId, type }).catch(() => {
    fired.delete(key);
  });
}
