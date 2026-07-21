export type SubscriptionTier = "free" | "premium";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  priceCents: number;
  renewsAt: string | null;
}

export function getSubscriptionStatus(_userId: string): SubscriptionStatus {
  // Placeholder subscription service. In production this checks Stripe Billing.
  return {
    tier: "free",
    priceCents: 499,
    renewsAt: null,
  };
}

export async function createPremiumSubscription(_userId: string): Promise<SubscriptionStatus> {
  return {
    tier: "premium",
    priceCents: 499,
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function cancelPremiumSubscription(_userId: string): Promise<SubscriptionStatus> {
  return {
    tier: "free",
    priceCents: 499,
    renewsAt: null,
  };
}
