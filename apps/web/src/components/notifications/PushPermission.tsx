import { useEffect, useState } from "react";
import { requestPushPermission, getPushPreferences, savePushPreferences } from "../../lib/push";
import { Bell, BellOff } from "lucide-react";

export function PushPermission() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [prefs, setPrefs] = useState(getPushPreferences());

  useEffect(() => {
    savePushPreferences(prefs);
  }, [prefs]);

  async function enable() {
    const granted = await requestPushPermission();
    setPermission(granted ? "granted" : "denied");
    if (granted) setPrefs((p) => ({ ...p, enabled: true }));
  }

  if (permission === "unsupported") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm text-white/50">
        <BellOff className="h-4 w-4" />
        Push notifications are not supported on this device.
      </div>
    );
  }

  if (permission !== "granted") {
    return (
      <button
        onClick={enable}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white"
      >
        <Bell className="h-4 w-4" />
        Enable push notifications
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Bell className="h-4 w-4 text-brand-400" />
        Push notifications enabled
      </div>
      <label className="mt-3 flex items-center justify-between text-sm text-white/70">
        Receive notifications
        <input
          type="checkbox"
          checked={prefs.enabled}
          onChange={(e) => setPrefs((p) => ({ ...p, enabled: e.target.checked }))}
          className="h-5 w-5 accent-brand-500"
        />
      </label>
    </div>
  );
}
