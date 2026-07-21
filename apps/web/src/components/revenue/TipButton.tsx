import { useState } from "react";
import { useTip } from "../../hooks/useRevenue";
import { Heart } from "lucide-react";

interface TipButtonProps {
  creatorId?: string;
}

const AMOUNTS = [100, 200, 500];

export function TipButton({ creatorId }: TipButtonProps) {
  const tip = useTip();
  const [amount, setAmount] = useState(100);
  const [showForm, setShowForm] = useState(false);

  async function handleTip() {
    if (!creatorId) return;
    await tip.mutateAsync({ creatorId, amountCents: amount });
    setShowForm(false);
    alert("Tip processed (placeholder)");
  }

  return (
    <div className="inline-flex flex-col gap-2">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-full bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-400"
        >
          <Heart className="h-4 w-4" />
          Tip creator
        </button>
      ) : (
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                  amount === a ? "bg-pink-500 text-white" : "bg-white/10 text-white/70"
                }`}
              >
                ${(a / 100).toFixed(0)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleTip}
              disabled={tip.isPending}
              className="rounded-lg bg-pink-500 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              {tip.isPending ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
