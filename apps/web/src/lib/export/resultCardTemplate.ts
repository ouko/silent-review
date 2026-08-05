export type ResultCardLayoutId = "grid" | "dial";

export interface ResultCardColors {
  background: string;
  backgroundGradient: [string, string];
  hit: string; // exact guess
  near: string; // off by 1
  miss: string; // off by 2+
  text: string;
  mutedText: string;
  accent: string;
  cardBackground: string;
}

export interface ResultCardTemplate {
  id: ResultCardLayoutId;
  width: number;
  height: number;
  padding: number;
  colors: ResultCardColors;
  fonts: {
    brand: string;
    heading: string;
    body: string;
    score: string;
    prompt: string;
  };
  sizes: {
    brandMark: number;
    heading: number;
    subheading: number;
    guessTile: number;
    guessTileGap: number;
    score: number;
    body: number;
    prompt: number;
  };
  positions: {
    brandMark: { x: number; y: number };
    heading: { x: number; y: number; maxWidth: number };
    subheading: { x: number; y: number };
    grid: { x: number; y: number };
    accuracy: { x: number; y: number };
    streak: { x: number; y: number };
    prompt: { x: number; y: number; maxWidth: number };
    qr: { x: number; y: number; size: number };
  };
}

const COLORS: ResultCardColors = {
  background: "#0a0a0a",
  backgroundGradient: ["#1a0b0e", "#0a0a0a"],
  hit: "#10b981", // emerald-500
  near: "#f59e0b", // amber-500
  miss: "#3f3f46", // zinc-700
  text: "#ffffff",
  mutedText: "rgba(255,255,255,0.6)",
  accent: "#f43f5e", // rose-500
  cardBackground: "rgba(255,255,255,0.07)",
};

const BASE_TEMPLATE: Omit<ResultCardTemplate, "id" | "positions"> = {
  width: 1080,
  height: 1920,
  padding: 60,
  colors: COLORS,
  fonts: {
    brand: "900 48px system-ui, -apple-system, sans-serif",
    heading: "900 84px system-ui, -apple-system, sans-serif",
    body: "600 36px system-ui, -apple-system, sans-serif",
    score: "900 120px system-ui, -apple-system, sans-serif",
    prompt: "700 42px system-ui, -apple-system, sans-serif",
  },
  sizes: {
    brandMark: 56,
    heading: 84,
    subheading: 40,
    guessTile: 96,
    guessTileGap: 20,
    score: 120,
    body: 36,
    prompt: 42,
  },
};

const GRID_TEMPLATE: ResultCardTemplate = {
  id: "grid",
  ...BASE_TEMPLATE,
  positions: {
    brandMark: { x: 60, y: 110 },
    heading: { x: 60, y: 260, maxWidth: 960 },
    subheading: { x: 60, y: 370 },
    grid: { x: 60, y: 520 },
    accuracy: { x: 60, y: 980 },
    streak: { x: 560, y: 980 },
    prompt: { x: 60, y: 1280, maxWidth: 700 },
    qr: { x: 820, y: 1420, size: 200 },
  },
};

const DIAL_TEMPLATE: ResultCardTemplate = {
  id: "dial",
  ...BASE_TEMPLATE,
  positions: {
    brandMark: { x: 60, y: 110 },
    heading: { x: 60, y: 260, maxWidth: 960 },
    subheading: { x: 60, y: 370 },
    grid: { x: 60, y: 520 },
    accuracy: { x: 60, y: 1100 },
    streak: { x: 560, y: 1100 },
    prompt: { x: 60, y: 1440, maxWidth: 700 },
    qr: { x: 820, y: 1580, size: 200 },
  },
};

const TEMPLATES: Record<ResultCardLayoutId, ResultCardTemplate> = {
  grid: GRID_TEMPLATE,
  dial: DIAL_TEMPLATE,
};

export function getResultCardTemplate(id: ResultCardLayoutId): ResultCardTemplate {
  return TEMPLATES[id];
}

export function listResultCardLayouts(): ResultCardLayoutId[] {
  return Object.keys(TEMPLATES) as ResultCardLayoutId[];
}
