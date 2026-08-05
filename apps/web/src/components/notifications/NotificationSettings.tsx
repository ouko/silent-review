import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getPushPreferences, savePushPreferences, type PushPreferences } from "../../lib/push";
import { PushPermission } from "./PushPermission";
import { Bell } from "lucide-react";
import { api } from "../../lib/api";

interface GamePreferences {
  dailyLive: boolean;
  streakAtRisk: boolean;
  challengeReceived: boolean;
  scoreBeaten: boolean;
}

const defaultGamePrefs: GamePreferences = {
  dailyLive: true,
  streakAtRisk: true,
  challengeReceived: true,
  scoreBeaten: true,
};

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<PushPreferences>(getPushPreferences());
  const [gamePrefs, setGamePrefs] = useState<GamePreferences>(defaultGamePrefs);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    savePushPreferences(prefs);
  }, [prefs]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ preferences: GamePreferences }>("/api/notifications/preferences")
      .then((res) => {
        if (!cancelled) setGamePrefs(res.data.preferences);
      })
      .catch(() => {
        if (!cancelled) setGamePrefs(defaultGamePrefs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function togglePush(key: keyof PushPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function toggleGame(key: keyof GamePreferences) {
    const next = { ...gamePrefs, [key]: !gamePrefs[key] };
    setGamePrefs(next);
    api.patch("/api/notifications/preferences", { [key]: next[key] }).catch(() => {
      // Revert on failure so the UI stays honest.
      setGamePrefs((p) => ({ ...p, [key]: !p[key] }));
    });
  }

  const pushOptions: { key: keyof PushPreferences; label: string }[] = [
    { key: "likes", label: "Likes on my reviews" },
    { key: "comments", label: "Comments on my reviews" },
    { key: "follows", label: "New followers" },
    { key: "guesses", label: "Guesses on my reviews" },
  ];

  const gameOptions: { key: keyof GamePreferences; label: string }[] = [
    { key: "dailyLive", label: "Daily Drop is live" },
    { key: "streakAtRisk", label: "Streak at risk" },
    { key: "challengeReceived", label: "New challenges" },
    { key: "scoreBeaten", label: "My score was beaten" },
  ];

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">Notifications</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            Choose what you hear about
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <PushPermission />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Notify me about</p>
          <div className="space-y-3">
            {pushOptions.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center justify-between text-sm font-semibold text-white/90"
              >
                {opt.label}
                <Toggle
                  checked={prefs[opt.key]}
                  onChange={() => togglePush(opt.key)}
                  disabled={!prefs.enabled}
                />
              </label>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Game notifications</p>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-white/50">Loading preferences…</p>
            ) : (
              gameOptions.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between text-sm font-semibold text-white/90"
                >
                  {opt.label}
                  <Toggle checked={gamePrefs[opt.key]} onChange={() => toggleGame(opt.key)} />
                </label>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-gradient-to-r from-rose-500 to-violet-500" : "bg-white/10"
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}
