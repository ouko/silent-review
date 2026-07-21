import { useAffiliateLink } from "../../hooks/useRevenue";
import { ExternalLink } from "lucide-react";

interface AffiliateLinksProps {
  productId?: string;
}

export function AffiliateLinks({ productId }: AffiliateLinksProps) {
  const { data, isLoading } = useAffiliateLink(productId);

  if (isLoading) return <p className="text-sm text-white/50">Loading...</p>;
  if (!data) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400"
    >
      <ExternalLink className="h-4 w-4" />
      Buy on {data.partner}
    </a>
  );
}
