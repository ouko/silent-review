import { useSubscription } from "../../hooks/useRevenue";
import { DollarSign, Crown } from "lucide-react";

export function EarningsDashboard() {
  const { status, subscribe, cancel } = useSubscription();

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Creator earnings</h2>
      <div className="rounded-2xl bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">$0.00</p>
            <p className="text-xs text-white/50">Lifetime earnings</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
              <Crown className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold">Silent Review Premium</p>
              <p className="text-xs text-white/50">
                {status.data?.tier === "premium" ? "Active" : "$4.99/month"}
              </p>
            </div>
          </div>
          {status.data?.tier === "premium" ? (
            <button
              onClick={() => cancel.mutate()}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => subscribe.mutate()}
              className="rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
