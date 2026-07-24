import { motion } from "framer-motion";

interface VideoInfoProps {
  username: string;
  avatarUrl?: string | null;
  caption?: string | null;
  productTag?: string | null;
}

export function VideoInfo({ username, avatarUrl, caption, productTag }: VideoInfoProps) {
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
          <p className="font-bold text-white">@{username}</p>
          {productTag && (
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              {productTag}
            </span>
          )}
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
