export interface RegionalConfig {
  /** ISO country code or region identifier. */
  region: string;
  /** Features that are blocked in this region. */
  blockedFeatures: string[];
  /** Whether this region requires explicit consent for data processing. */
  requiresConsent: boolean;
  /** Whether users in this region can request data deletion/export. */
  supportsDataRights: boolean;
}

export const REGIONAL_CONFIG: Record<string, RegionalConfig> = {
  EU: {
    region: "EU",
    blockedFeatures: ["tiktok_auth"],
    requiresConsent: true,
    supportsDataRights: true,
  },
  "US-CA": {
    region: "US-CA",
    blockedFeatures: [],
    requiresConsent: true,
    supportsDataRights: true,
  },
  CN: {
    region: "CN",
    blockedFeatures: ["google_auth", "tiktok_auth", "instagram_auth"],
    requiresConsent: true,
    supportsDataRights: true,
  },
  DEFAULT: {
    region: "DEFAULT",
    blockedFeatures: [],
    requiresConsent: false,
    supportsDataRights: true,
  },
};

export function getRegionalConfig(ipRegion?: string): RegionalConfig {
  if (!ipRegion) return REGIONAL_CONFIG.DEFAULT;
  return REGIONAL_CONFIG[ipRegion] ?? REGIONAL_CONFIG.DEFAULT;
}
