export interface ShareUrlOptions {
  provider?: "tiktok" | "instagram" | "copy" | "native";
  baseUrl?: string;
}

export function toHashtagSlug(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .replace(/^(\d)/, "_$1");
}

export function buildShareUrl(
  reviewId: string,
  productName: string,
  options: ShareUrlOptions = {}
): string {
  const base = options.baseUrl ?? window.location.origin;
  const campaign = options.provider ?? "share";
  const content = toHashtagSlug(productName) || "review";
  const url = new URL(`/review/${reviewId}`, base);
  url.searchParams.set("utm_source", "silentreview");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  return url.toString();
}
