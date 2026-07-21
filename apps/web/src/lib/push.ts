export interface PushPreferences {
  enabled: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  guesses: boolean;
}

const STORAGE_KEY = "silent-review-push-prefs";

export function getPushPreferences(): PushPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, likes: true, comments: true, follows: true, guesses: true };
}

export function savePushPreferences(prefs: PushPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendLocalNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const prefs = getPushPreferences();
  if (!prefs.enabled) return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

// OneSignal integration placeholder — replace with real OneSignal init if configured.
export function initOneSignal(_appId: string) {
  console.log("OneSignal placeholder initialized");
}
