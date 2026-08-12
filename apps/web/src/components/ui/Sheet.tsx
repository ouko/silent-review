import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxHeight?: string;
}

export function Sheet({ isOpen, onClose, children, title, maxHeight = "90%" }: SheetProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            style={{ maxHeight }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl border-t border-white/10 bg-void shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pt-2 pb-4">
                <h2 className="font-heading text-xl font-bold tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="tap-48 flex items-center justify-center rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-8 no-scrollbar">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
