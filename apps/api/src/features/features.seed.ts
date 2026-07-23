import { prisma } from "../prisma.js";

export const DEFAULT_FEATURE_FLAGS = [
  { key: "google_auth", enabled: true, description: "Enable Google OAuth login" },
  { key: "apple_auth", enabled: false, description: "Enable Apple OAuth login" },
  { key: "tiktok_auth", enabled: false, description: "Enable TikTok OAuth login" },
  { key: "instagram_auth", enabled: false, description: "Enable Instagram OAuth login" },
  { key: "advanced_feed", enabled: true, description: "Enable weighted feed algorithm" },
  { key: "duets", enabled: false, description: "Enable review duets" },
  { key: "challenges", enabled: false, description: "Enable friend challenges" },
  { key: "creator_tipping", enabled: false, description: "Enable creator tipping" },
  { key: "share_export", enabled: true, description: "Enable video share/export" },
];

export async function seedFeatureFlags(): Promise<void> {
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
}
