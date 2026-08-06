import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

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

  async function handleShopClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!productId || !affiliateUrl || clicking) return;
    setClicking(true);
    try {
      const { data } = await api.post<{ url: string }>(
        `/api/revenue/affiliate/${productId}/click`,
        { reviewId }
      );
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      // Fallback to stored URL if tracking call fails.
      window.open(affiliateUrl, "_blank", "noopener,noreferrer");
    } finally {
      setClicking(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-11 w-11 rounded-full border border-white/10 object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 text-sm font-bold text-white shadow-lg">
            {username[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          {userId ? (
            <Link
              to={`/profile/${userId}`}
              data-profile-link={username}
              className="font-bold text-white hover:text-rose-300"
              onClick={(e) => e.stopPropagation()}
            >
              @{username}
            </Link>
          ) : (
            <p className="font-bold text-white">@{username}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {productTag && (
              <span className="w-fit rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300 backdrop-blur-sm">
                #{productTag}
              </span>
            )}
            {productId && affiliateUrl && (
              <button
                onClick={handleShopClick}
                disabled={clicking}
                className="flex w-fit items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 backdrop-blur-sm transition-colors hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {clicking ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                Shop this product
              </button>
            )}
          </div>
        </div>
      </div>
      {caption && (
        <p className="max-w-xs text-sm leading-relaxed text-white/80">
          {caption}
        </p>
      )}
    </motion.div>
  );
}
