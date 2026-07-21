import { useState, useEffect } from "react";
import { getPushPreferences, savePushPreferences, type PushPreferences } from "../../lib/push";
import { PushPermission } from "./PushPermission";

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
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Notifications</h2>
      <PushPermission />
      <div className="rounded-xl bg-white/5 p-4">
        <p className="mb-3 text-sm font-semibold text-white/70">Notify me about</p>
        <div className="space-y-3">
          {options.map((opt) => (
            <label key={opt.key} className="flex items-center justify-between text-sm text-white/80">
              {opt.label}
              <input
                type="checkbox"
                checked={prefs[opt.key]}
                onChange={() => toggle(opt.key)}
                disabled={!prefs.enabled}
                className="h-5 w-5 accent-brand-500 disabled:opacity-40"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
