import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getPushPreferences, savePushPreferences, type PushPreferences } from "../../lib/push";
import { PushPermission } from "./PushPermission";
import { Bell } from "lucide-react";

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<PushPreferences>(getPushPreferences());

  useEffect(() => {
    savePushPreferences(prefs);
  }, [prefs]);

  function toggle(key: keyof PushPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const options: { key: keyof PushPreferences; label: string }[] = [
    { key: "likes", label: "Likes on my reviews" },
    { key: "comments", label: "Comments on my reviews" },
    { key: "follows", label: "New followers" },
    { key: "guesses", label: "Guesses on my reviews" },
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
            {options.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center justify-between text-sm font-semibold text-white/90"
              >
                {opt.label}
                <Toggle
                  checked={prefs[opt.key]}
                  onChange={() => toggle(opt.key)}
                  disabled={!prefs.enabled}
                />
              </label>
            ))}
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
