import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface SubscriptionStatus {
  tier: "free" | "premium";
  priceCents: number;
  renewsAt: string | null;
}

export function useSubscription() {
  const queryClient = useQueryClient();

  const status = useQuery<SubscriptionStatus>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await api.get("/api/revenue/subscription");
      return data;
    },
  });

  const subscribe = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/revenue/subscription");
      return data as SubscriptionStatus;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete("/api/revenue/subscription");
      return data as SubscriptionStatus;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });

  return { status, subscribe, cancel };
}

export function useAffiliateLink(productId?: string) {
  return useQuery<{ partner: string; url: string }>({
    queryKey: ["affiliate", productId],
    queryFn: async () => {
      const { data } = await api.get(`/api/revenue/affiliate/${productId}`);
      return data;
    },
    enabled: !!productId,
  });
}

export function useTip() {
  return useMutation({
    mutationFn: async ({ creatorId, amountCents }: { creatorId: string; amountCents: number }) => {
      const { data } = await api.post("/api/revenue/tips", { creatorId, amountCents });
      return data;
    },
  });
}
