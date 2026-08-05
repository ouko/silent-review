import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { sendLocalNotification } from "../../lib/push";
import { useAuthStore } from "../../stores/authStore";

interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
}

export function StreakAtRiskToast() {
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationDto | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // This component mounts at the root of the app (including /login), so it
    // must not call authenticated endpoints while the user is signed out.
    // Otherwise the 401 triggers the global axios interceptor, which reloads
    // /login and creates an infinite loop.
    if (!user) return;

    let cancelled = false;

    async function check() {
      try {
        const { data } = await api.get<{ notifications: NotificationDto[] }>("/api/notifications");
        const atRisk = data.notifications.find((n) => n.type === "STREAK_AT_RISK" && !n.readAt);
        if (atRisk && !cancelled) {
          setNotification(atRisk);
          setVisible(true);
          sendLocalNotification(atRisk.title, atRisk.body);
          await api.post(`/api/notifications/${atRisk.id}/read`);
        }
      } catch {
        // ignore polling errors
      }
    }

    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          className="fixed left-4 right-4 top-4 z-50 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-600 to-orange-600 p-4 text-white shadow-xl"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">{notification.title}</p>
              <p className="text-sm text-white/90">{notification.body}</p>
            </div>
            <button
              onClick={() => setVisible(false)}
              aria-label="Dismiss"
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
