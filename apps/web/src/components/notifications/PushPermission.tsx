import { useEffect, useState } from "react";
import { requestPushPermission, getPushPreferences, savePushPreferences } from "../../lib/push";
import { Bell, BellOff, BellRing } from "lucide-react";

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
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/50 backdrop-blur-sm">
        <BellOff className="h-5 w-5" />
        Push notifications are not supported on this device.
      </div>
    );
  }

  if (permission !== "granted") {
    return (
      <button
        onClick={enable}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90"
      >
        <Bell className="h-4 w-4" />
        Enable push notifications
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 text-sm font-bold text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
          <BellRing className="h-4 w-4 text-white" />
        </div>
        Push notifications enabled
      </div>
      <label className="mt-4 flex items-center justify-between text-sm font-semibold text-white/80">
        Receive notifications
        <Toggle
          checked={prefs.enabled}
          onChange={(checked) => setPrefs((p) => ({ ...p, enabled: checked }))}
        />
      </label>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-gradient-to-r from-rose-500 to-violet-500" : "bg-white/10"}`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}
