export type AffiliatePartner = "amazon" | "shareasale" | "rakuten" | "direct";

export function generateAffiliateLink(product: {
  id: string;
  name: string;
  affiliateUrl?: string | null;
}): { partner: AffiliatePartner; url: string } {
  if (product.affiliateUrl) {
    return { partner: "direct", url: product.affiliateUrl };
  }

  // Placeholder affiliate link generation. In production these would be signed
  // partner URLs with tracking IDs injected from environment variables.
  const encoded = encodeURIComponent(product.name);
  return {
    partner: "amazon",
    url: `https://www.amazon.com/s?k=${encoded}&tag=${process.env.AMAZON_ASSOCIATE_TAG ?? "silentreview-20"}`,
  };
}
