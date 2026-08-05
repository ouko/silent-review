export interface ResultCardUrlOptions {
  reviewId: string;
  dailyDropDate?: string; // YYYY-MM-DD
  challengeId?: string;
  baseUrl?: string;
}

export function buildResultCardUrl(options: ResultCardUrlOptions): string {
  const base = options.baseUrl ?? window.location.origin;
  const url = new URL(`/play/${options.reviewId}`, base);
  url.searchParams.set("channel", "result_card");
  if (options.dailyDropDate) {
    url.searchParams.set("dailyDrop", options.dailyDropDate);
  }
  if (options.challengeId) {
    url.searchParams.set("challenge", options.challengeId);
  }
  return url.toString();
}

export function parseResultCardUrl(url: string): {
  reviewId: string | null;
  channel: string | null;
  dailyDropDate: string | null;
  challengeId: string | null;
} {
  try {
    const parsed = new URL(url, window.location.origin);
    const pathMatch = parsed.pathname.match(/^\/play\/([^/]+)$/);
    return {
      reviewId: pathMatch?.[1] ?? null,
      channel: parsed.searchParams.get("channel"),
      dailyDropDate: parsed.searchParams.get("dailyDrop"),
      challengeId: parsed.searchParams.get("challenge"),
    };
  } catch {
    return { reviewId: null, channel: null, dailyDropDate: null, challengeId: null };
  }
}
