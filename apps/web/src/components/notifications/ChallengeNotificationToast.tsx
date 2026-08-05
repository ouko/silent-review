import { useEffect, useState } from "react";
import { Swords, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { useNavigate } from "react-router-dom";

interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { challengeId?: string; reviewId?: string };
  readAt: string | null;
}

export function ChallengeNotificationToast() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationDto | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function check() {
      try {
        const { data } = await api.get<{ notifications: NotificationDto[] }>("/api/notifications");
        const challengeNote = data.notifications.find(
          (n) =>
            (n.type === "CHALLENGE_RECEIVED" || n.type === "CHALLENGE_BEAT") &&
            !n.readAt &&
            n.data?.challengeId
        );
        if (challengeNote && !cancelled) {
          setNotification(challengeNote);
          setVisible(true);
          await api.post(`/api/notifications/${challengeNote.id}/read`);
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

  function handleClick() {
    if (notification?.data?.challengeId) {
      navigate(`/challenge/${notification.data.challengeId}`);
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.button
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          onClick={handleClick}
          className="fixed left-4 right-4 top-4 z-50 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600 to-rose-600 p-4 text-left text-white shadow-xl"
        >
          <div className="flex items-start gap-3">
            <Swords className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">{notification.title}</p>
              <p className="text-sm text-white/90">{notification.body}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
              aria-label="Dismiss"
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
