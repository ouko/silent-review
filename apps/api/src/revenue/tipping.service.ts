export interface TipIntent {
  id: string;
  amountCents: number;
  platformFeeCents: number;
  creatorReceivesCents: number;
  status: "pending" | "succeeded" | "failed";
}

export async function createTipIntent(_creatorId: string, amountCents: number): Promise<TipIntent> {
  // Stripe Connect placeholder. In production this creates a PaymentIntent with
  // application_fee_amount set to 15% of the tip and transfer_data to the creator.
  const platformFeeCents = Math.round(amountCents * 0.15);
  return {
    id: `tip_${Date.now()}`,
    amountCents,
    platformFeeCents,
    creatorReceivesCents: amountCents - platformFeeCents,
    status: "pending",
  };
}

export async function confirmTip(_tipId: string): Promise<{ status: "succeeded" | "failed" }> {
  return { status: "succeeded" };
}
