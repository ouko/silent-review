export type PlatformId = "tiktok" | "instagram" | "youtube" | "snapchat" | "twitter";

export interface PlatformTemplate {
  id: PlatformId;
  name: string;
  width: number;
  height: number;
  watermark: { x: number; y: number; size: number; opacity: number };
  caption: { x: number; y: number; maxWidth: number; fontSize: number; lineHeight: number };
  rating: { x: number; y: number; fontSize: number };
}

const TEMPLATES: Record<PlatformId, PlatformTemplate> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    width: 1080,
    height: 1920,
    watermark: { x: 40, y: 1840, size: 180, opacity: 0.7 },
    caption: { x: 40, y: 1720, maxWidth: 1000, fontSize: 36, lineHeight: 48 },
    rating: { x: 960, y: 180, fontSize: 96 },
  },
  instagram: {
    id: "instagram",
    name: "Instagram Reel",
    width: 1080,
    height: 1920,
    watermark: { x: 40, y: 1840, size: 180, opacity: 0.7 },
    caption: { x: 40, y: 1720, maxWidth: 1000, fontSize: 36, lineHeight: 48 },
    rating: { x: 960, y: 180, fontSize: 96 },
  },
  youtube: {
    id: "youtube",
    name: "YouTube Short",
    width: 1080,
    height: 1920,
    watermark: { x: 40, y: 1840, size: 180, opacity: 0.7 },
    caption: { x: 40, y: 1720, maxWidth: 1000, fontSize: 36, lineHeight: 48 },
    rating: { x: 960, y: 180, fontSize: 96 },
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    width: 1080,
    height: 1920,
    watermark: { x: 40, y: 1840, size: 160, opacity: 0.6 },
    caption: { x: 40, y: 1700, maxWidth: 1000, fontSize: 34, lineHeight: 46 },
    rating: { x: 940, y: 160, fontSize: 88 },
  },
  twitter: {
    id: "twitter",
    name: "Twitter / X",
    width: 1280,
    height: 720,
    watermark: { x: 30, y: 640, size: 140, opacity: 0.7 },
    caption: { x: 30, y: 580, maxWidth: 800, fontSize: 28, lineHeight: 38 },
    rating: { x: 1160, y: 70, fontSize: 72 },
  },
};

export function getPlatformTemplate(id: PlatformId): PlatformTemplate {
  return TEMPLATES[id];
}

export function listPlatforms(): PlatformTemplate[] {
  return Object.values(TEMPLATES);
}
