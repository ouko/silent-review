import { prisma } from "../prisma.js";

const providerFlagMap: Record<string, string> = {
  tiktok: "tiktok_auth",
  instagram: "instagram_auth",
};

export async function isProviderEnabled(providerId: string, envAvailable: boolean): Promise<boolean> {
  if (!envAvailable) return false;

  const flagKey = providerFlagMap[providerId];
  if (!flagKey) return true;

  const flag = await prisma.featureFlag.findUnique({ where: { key: flagKey } });
  return flag?.enabled ?? false;
}

export async function getEnabledProviders(
  availability: Record<string, boolean>
): Promise<string[]> {
  const results: string[] = [];
  for (const [providerId, envAvailable] of Object.entries(availability)) {
    if (await isProviderEnabled(providerId, envAvailable)) {
      results.push(providerId);
    }
  }
  return results;
}
