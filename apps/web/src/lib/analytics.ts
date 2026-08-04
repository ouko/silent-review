import { api } from "./api";

export type AnalyticsChannel = "organic" | "challenge_link" | "result_card" | "creator_link";

export type AnalyticsEventType =
  | "app_open"
  | "first_round_complete"
  | "guess_submitted"
  | "daily_drop_played"
  | "share_card_created"
  | "share_card_clicked"
  | "challenge_sent"
  | "challenge_accepted"
  | "streak_milestone"
  | "invite_sent"
  | "invite_install_attributed";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  userId?: string | null;
  sessionId: string;
  channel: AnalyticsChannel;
  properties?: Record<string, unknown>;
  timestamp: string;
}

const SESSION_KEY = "sr_analytics_session_id";
const CHANNEL_KEY = "sr_analytics_channel";
const FIRST_ROUND_KEY = "sr_analytics_first_round";
const DAILY_DROP_KEY = "sr_analytics_daily_drop_date";
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 10_000;

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | null = null;
let currentChannel: AnalyticsChannel = "organic";
const trackedMilestones = new Set<number>();

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readChannelFromUrl(): AnalyticsChannel | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const channel = params.get("channel") ?? params.get("utm_medium") ?? params.get("sr_channel");
  if (!channel) return null;
  return normalizeChannel(channel);
}

function normalizeChannel(channel: string): AnalyticsChannel {
  const allowed = new Set<AnalyticsChannel>(["organic", "challenge_link", "result_card", "creator_link"]);
  return allowed.has(channel as AnalyticsChannel) ? (channel as AnalyticsChannel) : "organic";
}

export function initAnalytics(userId?: string | null, channel?: AnalyticsChannel) {
  currentUserId = userId ?? null;

  const urlChannel = readChannelFromUrl();
  if (urlChannel) {
    currentChannel = urlChannel;
    try {
      localStorage.setItem(CHANNEL_KEY, urlChannel);
    } catch {
      // ignore storage errors
    }
  } else {
    try {
      const stored = localStorage.getItem(CHANNEL_KEY);
      currentChannel = stored ? normalizeChannel(stored) : (channel ?? "organic");
    } catch {
      currentChannel = channel ?? "organic";
    }
  }

  if (flushTimer) {
    clearInterval(flushTimer);
  }
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushSync);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushSync();
      }
    });
  }
}

export function setAnalyticsUser(userId: string | null) {
  currentUserId = userId;
}

export function trackEvent(type: AnalyticsEventType, properties?: Record<string, unknown>) {
  const event: AnalyticsEvent = {
    type,
    userId: currentUserId,
    sessionId: getSessionId(),
    channel: currentChannel,
    properties: sanitizeProperties(properties),
    timestamp: new Date().toISOString(),
  };

  queue.push(event);

  if (queue.length >= BATCH_SIZE) {
    flushEvents();
  }
}

function sanitizeProperties(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!properties) return undefined;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    // No PII beyond userId. Drop anything that looks like an email or free-text name.
    if (typeof value === "string" && /@/.test(value)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

let isFlushing = false;

export async function flushEvents(): Promise<void> {
  if (isFlushing || queue.length === 0) return;
  isFlushing = true;

  const batch = queue.splice(0, queue.length);
  try {
    await api.post("/api/analytics/events/batch", { events: batch });
  } catch (err) {
    // If the batch fails, drop it silently so analytics never blocks UX.
    // In development we still log so engineers notice.
    if (import.meta.env.DEV) {
      console.warn("Analytics flush failed", err);
    }
  } finally {
    isFlushing = false;
  }
}

function flushSync() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const blob = new Blob([JSON.stringify({ events: batch })], { type: "application/json" });
  navigator.sendBeacon?.("/api/analytics/events/batch", blob);
}

export function getAnalyticsQueueSize(): number {
  return queue.length;
}

export function getAnalyticsSessionId(): string {
  return getSessionId();
}

export function getAnalyticsChannel(): AnalyticsChannel {
  return currentChannel;
}

export function trackFirstRoundComplete(properties?: Record<string, unknown>) {
  try {
    if (localStorage.getItem(FIRST_ROUND_KEY)) return;
    localStorage.setItem(FIRST_ROUND_KEY, "1");
  } catch {
    // ignore storage errors
  }
  trackEvent("first_round_complete", properties);
}

export function trackDailyDropPlayed(properties?: Record<string, unknown>) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(DAILY_DROP_KEY) === today) return;
    localStorage.setItem(DAILY_DROP_KEY, today);
  } catch {
    // ignore storage errors
  }
  trackEvent("daily_drop_played", properties);
}

export function trackStreakMilestone(streakDays: number) {
  const milestones = [7, 14, 30, 60, 100];
  for (const milestone of milestones) {
    if (streakDays >= milestone && !trackedMilestones.has(milestone)) {
      trackedMilestones.add(milestone);
      trackEvent("streak_milestone", { milestone, streakDays });
    }
  }
}
