import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";

interface VideoInfoProps {
  username: string;
  userId?: string;
  avatarUrl?: string | null;
  caption?: string | null;
  productTag?: string | null;
  reviewId?: string;
  productId?: string;
  affiliateUrl?: string | null;
}

export function VideoInfo({
  username,
  userId,
  avatarUrl,
  caption,
  productTag,
  reviewId,
  productId,
  affiliateUrl,
}: VideoInfoProps) {
  const [clicking, setClicking] = useState(false);
  const reducedMotion = useReducedMotion();

  async function handleShopClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!productId || !affiliateUrl || clicking) return;
    setClicking(true);
    try {
      const { data } = await api.post<{ url: string }>(`/api/revenue/affiliate/${productId}/click`, { reviewId });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(affiliateUrl, "_blank", "noopener,noreferrer");
    } finally {
      setClicking(false);
    }
  }

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <Avatar src={avatarUrl} name={username} size="md" />
        <div className="flex flex-col">
          {userId ? (
            <Link
              to={`/profile/${userId}`}
              data-profile-link={username}
              className="font-bold text-white transition-colors hover:text-primary-300"
              onClick={(e) => e.stopPropagation()}
            >
              @{username}
            </Link>
          ) : (
            <p className="font-bold text-white">@{username}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {productTag && <Badge variant="pink">#{productTag}</Badge>}
            {productId && affiliateUrl && (
              <button
                onClick={handleShopClick}
                disabled={clicking}
                className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-lime/15 px-3 py-1 text-xs font-bold text-accent-lime ring-1 ring-accent-lime/30 transition-colors hover:bg-accent-lime/25 disabled:opacity-60"
              >
                {clicking ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Shop this
              </button>
            )}
          </div>
        </div>
      </div>
      {caption && <p className="max-w-xs text-sm leading-relaxed text-white/80">{caption}</p>}
    </motion.div>
  );
}
