import { useSubscription } from "../../hooks/useRevenue";
import { Crown } from "lucide-react";

export function PremiumBadge() {
  const { status } = useSubscription();

  if (status.data?.tier !== "premium") return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-bold text-white">
      <Crown className="h-3 w-3" />
      Premium
    </div>
  );
}
