import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../stores/uiStore";
import { CheckCircle2, XCircle, Info } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: { id: string; message: string; type: "success" | "error" | "info" };
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles =
    toast.type === "success"
      ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-100"
      : toast.type === "error"
        ? "from-red-500/20 to-red-500/5 border-red-500/30 text-red-100"
        : "from-white/10 to-white/5 border-white/20 text-white";

  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={`pointer-events-auto flex items-center justify-center gap-2 rounded-2xl border bg-gradient-to-r ${styles} px-4 py-3 text-center text-sm font-bold shadow-lg backdrop-blur-md`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {toast.message}
    </motion.div>
  );
}
