import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Check, X, Calendar } from "lucide-react";
import type { ArchiveItem } from "../../hooks/useDailyDrop";

interface ArchiveCalendarProps {
  items: ArchiveItem[];
}

function formatArchiveDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ArchiveCalendar({ items }: ArchiveCalendarProps) {
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-4" style={{ scrollbarWidth: "none" }}>
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-rose-400" />
        <h2 className="text-lg font-black text-white">Daily Drop Archive</h2>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <Eye className="mb-2 h-8 w-8 text-white/30" />
          <p className="text-sm font-bold text-white/50">No past Daily Drops yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => {
            const played = item.played ?? false;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedItem(item)}
                className={[
                  "group relative aspect-[3/4] overflow-hidden rounded-2xl border text-left transition-colors",
                  played
                    ? "border-emerald-500/30 ring-1 ring-emerald-500/20"
                    : "border-white/10 hover:border-white/20",
                ].join(" ")}
              >
                {item.review.thumbnailUrl ? (
                  <img
                    src={item.review.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/20 to-violet-500/20">
                    <Eye className="h-10 w-10 text-white/30" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                  {formatArchiveDate(item.date)}
                </div>

                {played && (
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-emerald-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                    <Check className="h-3 w-3" />
                    Played
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="line-clamp-1 text-xs font-bold text-white/80">
                    {item.review.productTag ?? item.review.product.name}
                  </p>
                  <p className="mt-1 text-2xl font-black leading-none text-white">
                    {item.review.rating}
                    <span className="text-sm text-white/40">/10</span>
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 text-white"
            >
              <div className="relative aspect-video">
                {selectedItem.review.thumbnailUrl ? (
                  <img
                    src={selectedItem.review.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/20 to-violet-500/20">
                    <Eye className="h-12 w-12 text-white/30" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                  {formatArchiveDate(selectedItem.date)}
                </p>
                <p className="mt-1 text-sm font-bold text-white/80">
                  {selectedItem.review.productTag ?? selectedItem.review.product.name}
                </p>
                <p className="mt-3 text-7xl font-black leading-none tracking-tighter gradient-text">
                  {selectedItem.review.rating}
                  <span className="text-2xl text-white/40">/10</span>
                </p>
                {selectedItem.isOverride && (
                  <p className="mt-3 text-xs font-bold text-rose-400">Editor&apos;s pick</p>
                )}
                <p className="mt-4 text-xs text-white/50">
                  Archive drops can&apos;t be replayed.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
