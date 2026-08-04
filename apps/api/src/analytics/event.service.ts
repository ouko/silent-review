import { prisma } from "../prisma.js";
import { isFeatureEnabled } from "../features/features.service.js";

export interface AnalyticsEventInput {
  type: string;
  userId?: string | null;
  sessionId?: string | null;
  channel?: string;
  properties?: Record<string, unknown>;
  timestamp?: string; // ISO string from client
}

export async function ingestEvents(events: AnalyticsEventInput[]): Promise<{ stored: number }> {
  const enabled = await isFeatureEnabled("analytics");
  if (!enabled) {
    return { stored: 0 };
  }

  const rules = (await getAnalyticsRules()) ?? {};
  const sampleRate = typeof rules.sampleRate === "number" ? rules.sampleRate : 1;

  const toStore = events
    .filter((e) => isValidEventType(e.type))
    .filter(() => sampleRate >= 1 || Math.random() < sampleRate)
    .map((e) => ({
      type: e.type,
      userId: e.userId ?? null,
      sessionId: e.sessionId ?? null,
      channel: normalizeChannel(e.channel),
      properties: (e.properties ?? {}) as any,
      createdAt: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

  if (toStore.length === 0) {
    return { stored: 0 };
  }

  const result = await prisma.event.createMany({ data: toStore });
  return { stored: result.count };
}

function isValidEventType(type: string): boolean {
  // Allow known event types. Unknown types are dropped to keep the table clean.
  const known = new Set([
    "app_open",
    "first_round_complete",
    "guess_submitted",
    "daily_drop_played",
    "share_card_created",
    "share_card_clicked",
    "challenge_sent",
    "challenge_accepted",
    "streak_milestone",
    "invite_install_attributed",
  ]);
  return known.has(type);
}

function normalizeChannel(channel?: string): string {
  if (!channel) return "organic";
  const allowed = new Set(["organic", "challenge_link", "result_card", "creator_link"]);
  return allowed.has(channel) ? channel : "organic";
}

async function getAnalyticsRules(): Promise<Record<string, unknown> | null> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: "analytics" } });
  return (flag?.rules as Record<string, unknown>) ?? null;
}
