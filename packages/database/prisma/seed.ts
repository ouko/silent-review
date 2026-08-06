import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/client.js";
import { runDailyRollup } from "../src/analytics/rollup.service.js";

const SALT_ROUNDS = 12;
const DEMO_PASSWORD = "DemoPass123!";
const DAY_MS = 24 * 60 * 60 * 1000;
const PROJECT_ROOT = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const SEED_VIDEO_DIR = join(PROJECT_ROOT, "uploads", "seed");
const SEED_VIDEO_COUNT = 60;
const SEED_VIDEO_DURATION = 5;

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Beauty",
  "Home",
  "Sports",
  "Food",
  "Toys",
  "Automotive",
  "Books",
  "Health",
];

const BRANDS: Record<string, string[]> = {
  Electronics: ["TechPro", "GadgetCo", "SoundWave", "PixelPerfect", "ChargeMax"],
  Fashion: ["UrbanThread", "StreetStyle", "LuxeLine", "EcoWear", "FitForm"],
  Beauty: ["GlowUp", "PureSkin", "BoldLook", "FreshFace", "SilkTouch"],
  Home: ["ComfortLiving", "ModernNest", "CleanSpace", "BrightHome", "CozyCorner"],
  Sports: ["PeakPro", "ActiveLife", "RunFast", "FlexGear", "AquaSport"],
  Food: ["TastyBites", "OrganicEats", "SnackWorld", "FreshFarm", "SweetTreat"],
  Toys: ["PlayTime", "FunZone", "KidSmart", "ToyBox", "WonderWorks"],
  Automotive: ["DrivePro", "AutoMax", "RoadReady", "TurboCare", "ShieldAuto"],
  Books: ["PageTurner", "MindShelf", "StoryLine", "KnowledgePress", "FictionHouse"],
  Health: ["VitaWell", "MediCare", "StrongLife", "DailyBoost", "ZenHealth"],
};

const ADJECTIVES = [
  "Premium", "Ultra", "Pro", "Smart", "Eco", "Compact", "Wireless", "Portable",
  "Ergonomic", "Durable", "Stylish", "Lightweight", "Advanced", "Essential",
  "Deluxe", "Mini", "Max", "Rapid", "Silent", "Bright",
];

const NOUNS: Record<string, string[]> = {
  Electronics: ["Headphones", "Charger", "Speaker", "Smartwatch", "Tablet", "Camera", "Keyboard", "Mouse", "Monitor", "Hub"],
  Fashion: ["Sneakers", "Jacket", "Backpack", "Sunglasses", "Watch", "Hoodie", "Jeans", "Scarf", "Belt", "Cap"],
  Beauty: ["Moisturizer", "Serum", "Lipstick", "Mascara", "Cleanser", "Sunscreen", "Perfume", "Shampoo", "Mask", "Palette"],
  Home: ["Lamp", "Pillow", "Blanket", "Vacuum", "Organizer", "Mirror", "Rug", "Curtain", "Planter", "Clock"],
  Sports: ["Yoga Mat", "Resistance Band", "Water Bottle", "Running Shoes", "Dumbbell", "Tennis Racket", "Cycling Helmet", "Jump Rope", "Foam Roller", "Gloves"],
  Food: ["Protein Bar", "Coffee Beans", "Tea Set", "Hot Sauce", "Olive Oil", "Chocolate Box", "Granola", "Pasta", "Honey", "Snack Pack"],
  Toys: ["Building Blocks", "Board Game", "Puzzle", "Action Figure", "Doll", "RC Car", "Science Kit", "Plush Toy", "Craft Set", "Robot"],
  Automotive: ["Phone Mount", "Dash Cam", "Seat Cover", "Air Freshener", "Tire Pressure Gauge", "USB Adapter", "Floor Mats", "Wax Kit", "Jump Starter", "Organizer"],
  Books: ["Novel", "Cookbook", "Self-Help Guide", "Thriller", "Biography", "Sci-Fi Anthology", "Poetry Collection", "History Book", "Children's Book", "Comic"],
  Health: ["Vitamin Pack", "Protein Powder", "Fitness Tracker", "Massage Gun", "First Aid Kit", "Supplement", "Resistance Band", "Water Filter", "Sleep Mask", "Scale"],
};

const COMMENTS = [
  "I guessed way off 😂",
  "This looks amazing!",
  "Totally agree with this rating.",
  "Hmm, I would have rated it lower.",
  "Spot on review!",
  "Need this in my life.",
  "Not convinced, looks mid.",
  "Great take!",
  "I got it exactly right! 🎯",
  "Way overpriced tbh.",
  "Buying one today.",
  "The quality looks unreal.",
  "Would not recommend.",
  "This aged well.",
  "Solid review 🔥",
  "Honestly surprised by the rating.",
  "My guess was so close!",
  "This is exactly my vibe.",
  "Not what I expected.",
  "Instant classic.",
  "Take my money 💸",
  "I disagree but respect the take.",
  "How is this only a 6?",
  "Deserves more likes.",
  "First time guessing and I nailed it.",
];

const BIOS = [
  "Professional guesser. Amateur reviewer.",
  "I rate things so you don't have to.",
  "Silent but opinionated.",
  "Here for the vibes and the points.",
  "Product nerd • Guess addict",
  "Can you beat my streak?",
  "Just here to guess ratings.",
  "Reviewing the world, one video at a time.",
  "Collector of hot takes.",
  "If it exists, I'll rate it.",
  "Chasing exact guesses and good lighting.",
  "I call it like I see it.",
  "Daily drop loyalist.",
  "Merchant by day, reviewer by night.",
  "Curating the best products for you.",
  "Building a community of guessers.",
  "Creator first, reviewer always.",
  "Points, streaks, and honest ratings.",
  "On a mission to find the perfect 10.",
  "Guess fast, review faster.",
];

interface VideoAsset {
  path: string;
  format: "video/webm" | "video/mp4";
  duration: number;
  category: string;
}

function generateSeedVideos(): VideoAsset[] {
  if (!existsSync(SEED_VIDEO_DIR)) {
    mkdirSync(SEED_VIDEO_DIR, { recursive: true });
  }

  const hasFfmpeg = (() => {
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  if (!hasFfmpeg) {
    console.warn("ffmpeg not found; falling back to a single placeholder video for seeding.");
    return [{ path: "/uploads/placeholder-review.webm", format: "video/webm", duration: 5, category: "Home" }];
  }

  const palette = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
    "#d946ef", "#f43f5e", "#78716c", "#64748b", "#334155",
  ];

  const generated: VideoAsset[] = [];
  for (let i = 0; i < SEED_VIDEO_COUNT; i++) {
    const fileName = `seed-${i}.mp4`;
    const filePath = join(SEED_VIDEO_DIR, fileName);
    const publicPath = `/uploads/seed/${fileName}`;

    if (!existsSync(filePath)) {
      const color = palette[i % palette.length];
      const cmd = `ffmpeg -f lavfi -i color=c=${color}:s=480x854:d=${SEED_VIDEO_DURATION} -c:v libx264 -preset fast -crf 28 -pix_fmt yuv420p -movflags +faststart -an "${filePath}" -y`;
      try {
        execSync(cmd, { stdio: "ignore", timeout: 30000 });
      } catch (err) {
        console.warn(`Failed to generate seed video ${fileName}, skipping.`, err);
        continue;
      }
    }

    if (existsSync(filePath)) {
      generated.push({
        path: publicPath,
        format: "video/mp4",
        duration: SEED_VIDEO_DURATION,
        category: CATEGORIES[i % CATEGORIES.length],
      });
    }
  }

  if (generated.length === 0) {
    return [{ path: "/uploads/placeholder-review.webm", format: "video/webm", duration: 5, category: "Home" }];
  }

  console.log(`Using ${generated.length} generated seed videos`);
  return generated;
}

const VIDEO_ASSETS: VideoAsset[] = generateSeedVideos();

const CAPTIONS = [
  "My take on the",
  "Quick review:",
  "Honest thoughts on",
  "First impressions of",
  "Would you buy the",
  "Rating the",
  "Is the",
  "Real talk on the",
  "Testing the",
  "Unfiltered review of the",
  "Hot take on the",
  "Deep dive into the",
  "Why I love the",
  "The truth about the",
  "Guess the rating for the",
];

const BASE_DEMO_USERS: [string, string, string][] = [
  ["demo@silentreview.app", "demouser", "Demo User"],
  ["alice@silentreview.app", "alice", "Alice"],
  ["bob@silentreview.app", "bob", "Bob"],
  ["maya@silentreview.app", "maya", "Maya Chen"],
  ["jax@silentreview.app", "jax", "Jax Rivera"],
  ["sofia@silentreview.app", "sofia", "Sofia Kim"],
  ["leo@silentreview.app", "leo", "Leo Patel"],
  ["zoe@silentreview.app", "zoe", "Zoe Thompson"],
  ["noah@silentreview.app", "noah", "Noah Brooks"],
  ["luna@silentreview.app", "luna", "Luna Martinez"],
  ["kai@silentreview.app", "kai", "Kai Anderson"],
  ["nina@silentreview.app", "nina", "Nina Wright"],
];

const EXTRA_DEMO_USERS: [string, string, string][] = [
  ["oliver@silentreview.app", "oliver", "Oliver James"],
  ["emma@silentreview.app", "emma", "Emma Rose"],
  ["liam@silentreview.app", "liam", "Liam Ford"],
  ["ava@silentreview.app", "ava", "Ava Lane"],
  ["ethan@silentreview.app", "ethan", "Ethan Cole"],
  ["mia@silentreview.app", "mia", "Mia Grey"],
  ["lucas@silentreview.app", "lucas", "Lucas Reed"],
  ["isabella@silentreview.app", "isabella", "Isabella Cruz"],
  ["mason@silentreview.app", "mason", "Mason Blake"],
  ["sophia@silentreview.app", "sophia", "Sophia Quinn"],
  ["logan@silentreview.app", "logan", "Logan Hayes"],
  ["charlotte@silentreview.app", "charlotte", "Charlotte Rose"],
  ["james@silentreview.app", "james", "James Dean"],
  ["amelia@silentreview.app", "amelia", "Amelia Sky"],
  ["benjamin@silentreview.app", "benjamin", "Benjamin Pike"],
  ["harper@silentreview.app", "harper", "Harper Vale"],
  ["henry@silentreview.app", "henry", "Henry Knox"],
  ["evelyn@silentreview.app", "evelyn", "Evelyn Wren"],
  ["alexander@silentreview.app", "alexander", "Alexander Fox"],
  ["abigail@silentreview.app", "abigail", "Abigail Moon"],
  ["daniel@silentreview.app", "daniel", "Daniel North"],
  ["ella@silentreview.app", "ella", "Ella Storm"],
  ["matthew@silentreview.app", "matthew", "Matthew Frost"],
  ["scarlett@silentreview.app", "scarlett", "Scarlett Ray"],
  ["jackson@silentreview.app", "jackson", "Jackson Stone"],
  ["grace@silentreview.app", "grace", "Grace Hill"],
  ["sebastian@silentreview.app", "sebastian", "Sebastian Lake"],
  ["chloe@silentreview.app", "chloe", "Chloe Dawn"],
  ["aiden@silentreview.app", "aiden", "Aiden Chase"],
  ["victoria@silentreview.app", "victoria", "Victoria Snow"],
  ["samuel@silentreview.app", "samuel", "Samuel West"],
  ["riley@silentreview.app", "riley", "Riley Brooks"],
  ["david@silentreview.app", "david", "David Knight"],
  ["aria@silentreview.app", "aria", "Aria Frost"],
  ["joseph@silentreview.app", "joseph", "Joseph Vale"],
  ["lily@silentreview.app", "lily", "Lily Ash"],
  ["carter@silentreview.app", "carter", "Carter Wild"],
  ["aubrey@silentreview.app", "aubrey", "Aubrey Sky"],
];

const ALL_DEMO_USERS = [...BASE_DEMO_USERS, ...EXTRA_DEMO_USERS];

function roleForIndex(index: number): "ADMIN" | "MERCHANT" | "CREATOR" | "USER" {
  if (index === 0) return "ADMIN";
  if (index >= 1 && index <= 3) return "MERCHANT";
  if (index >= 4 && index <= 8) return "CREATOR";
  return "USER";
}

// Deterministic random number generator (mulberry32) so demo data is stable.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20240805);

function sample<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function sampleMany<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => rng() - 0.5);
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function chance(p: number): boolean {
  return rng() < p;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()));
}

function toUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(rng() * chars.length)];
  }
  return result;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function generateProducts(count = 1000) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const category = sample(CATEGORIES);
    const brand = sample(BRANDS[category]);
    const adjective = sample(ADJECTIVES);
    const noun = sample(NOUNS[category]);
    const name = `${brand} ${adjective} ${noun}`;
    const tags = [category.toLowerCase(), brand.toLowerCase(), adjective.toLowerCase(), noun.toLowerCase().replace(/\s+/g, "-")];

    products.push({
      name,
      brand,
      category,
      description: `A ${adjective.toLowerCase()} ${noun.toLowerCase()} from ${brand} in the ${category} category.`,
      imageUrl: null,
      affiliateUrl: null,
      tags,
      metadata: { seeded: true, index: i + 1 },
      searchVector: `${name} ${brand} ${category} ${tags.join(" ")}`.toLowerCase(),
    });
  }
  return products;
}

async function clearSeededData() {
  // Truncate tables that contain seeded demo content (CASCADE handles FKs)
  const tables = [
    '"ChallengeParticipant"',
    '"Challenge"',
    '"Notification"',
    '"Invite"',
    '"UserAchievement"',
    '"Follow"',
    '"Guess"',
    '"Like"',
    '"Comment"',
    '"ShareEvent"',
    '"VideoModeration"',
    '"DailyDrop"',
    '"ContentCuration"',
    '"MetricSnapshot"',
    '"Event"',
    '"Review"',
    '"Product"',
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE;`);
  }
  // Remove synthetic analytics-only users created by event seeding.
  await prisma.user.deleteMany({ where: { email: { startsWith: "analytics-seed-" } } });
  console.log("Cleared old seeded demo data");
}

function guessRating(realRating: number): number {
  // Realistic guesses cluster around the real rating.
  const offsets = [-2, -1, 0, 1, 2];
  const weights = [0.06, 0.18, 0.52, 0.18, 0.06];
  const r = rng();
  let cumulative = 0;
  for (let i = 0; i < offsets.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) {
      return Math.max(1, Math.min(10, realRating + offsets[i]));
    }
  }
  return Math.max(1, Math.min(10, realRating));
}

function scoreForGuess(realRating: number, guessed: number): { score: number; isCorrect: boolean } {
  const diff = Math.abs(guessed - realRating);
  let score = 0;
  if (diff === 0) score = 10;
  else if (diff === 1) score = 5;
  else if (diff === 2) score = 2;
  const isCorrect = diff === 0;
  return { score, isCorrect };
}

function computeGuessabilityScore(
  review: any,
  distribution?: number[]
): number {
  const TEN_DAYS_MS = 10 * DAY_MS;
  const guessCount = Math.max(review.guessCount ?? 0, review._count?.guesses ?? 0);
  const likeCount = review.likeCount ?? 0;
  const exactRatio = guessCount > 0 ? (review.exactGuessCount ?? 0) / guessCount : 0;

  const guessScore = Math.min(25, guessCount * 1.25);
  const likeScore = Math.min(5, likeCount * 0.1);
  const engagementScore = guessScore + likeScore;

  let distributionScore = 15;
  if (distribution && distribution.length === 10) {
    const total = distribution.reduce((a: number, b: number) => a + b, 0);
    if (total > 0) {
      const mean = distribution.reduce((sum: number, count: number, idx: number) => sum + count * (idx + 1), 0) / total;
      const variance = distribution.reduce(
        (sum: number, count: number, idx: number) => sum + count * Math.pow(idx + 1 - mean, 2),
        0
      ) / total;
      const stdDev = Math.sqrt(variance);
      distributionScore = Math.min(30, stdDev * 10);
    }
  }

  const exactRatioScore = Math.max(0, 10 - Math.abs(exactRatio - 0.25) * 40);
  const guessabilityScore = distributionScore + exactRatioScore;

  const duration = review.duration ?? 10;
  let durationScore = 0;
  if (duration >= 15 && duration <= 60) {
    durationScore = 15;
  } else if (duration < 15) {
    durationScore = Math.max(0, (duration / 15) * 15);
  } else {
    durationScore = Math.max(0, 15 - ((duration - 60) / 120) * 15);
  }

  const category = review.product?.category ?? "";
  const categoryScore = Math.max(0, 10 - Math.max(0, category.length - 10) * 0.4);

  const ageMs = Date.now() - new Date(review.createdAt).getTime();
  const freshnessScore = ageMs <= TEN_DAYS_MS ? 5 * (1 - ageMs / TEN_DAYS_MS) : 0;

  const raw = engagementScore + guessabilityScore + durationScore + categoryScore + freshnessScore;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

async function buildGuessDistributions(reviewIds: string[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (reviewIds.length === 0) return map;

  const rows = await prisma.guess.groupBy({
    by: ["reviewId", "guessedRating"],
    where: { reviewId: { in: reviewIds }, guessedRating: { gte: 1, lte: 10 } },
    _count: true,
  });

  for (const row of rows) {
    const dist = map.get(row.reviewId) ?? new Array(10).fill(0);
    const idx = row.guessedRating - 1;
    if (idx >= 0 && idx < 10) {
      dist[idx] = row._count;
    }
    map.set(row.reviewId, dist);
  }

  return map;
}

async function seedDemoUsers(demoPassword: string) {
  const now = new Date();
  const start = new Date(now.getTime() - 90 * DAY_MS);
  const hashedPassword = await hashPassword(demoPassword);

  const userInputs = ALL_DEMO_USERS.map(([email, username, displayName], index) => ({
    email,
    username,
    displayName,
    passwordHash: hashedPassword,
    emailVerified: true,
    bio: sample(BIOS),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    totalPoints: randomInt(100, 15000),
    streakDays: randomInt(0, 90),
    longestStreak: randomInt(0, 120),
    role: roleForIndex(index),
    createdAt: randomDate(start, now),
  }));

  const users = [];
  for (const input of userInputs) {
    users.push(
      await prisma.user.upsert({
        where: { email: input.email },
        update: {
          passwordHash: input.passwordHash,
          emailVerified: input.emailVerified,
          role: input.role,
        },
        create: input,
      })
    );
  }
  console.log(`Seeded ${users.length} demo users`);
  return users;
}

async function seedAchievements() {
  const achievementSpecs = [
    ["first_guess", "First Guess", "Submit your first rating guess", 10],
    ["first_review", "First Review", "Post your first silent review", 25],
    ["exact_10", "Perfect 10", "Make 10 exact guesses", 50],
    ["streak_7", "Week Streak", "Maintain a 7-day streak", 100],
    ["social_butterfly", "Social Butterfly", "Follow 10 users", 30],
    ["trendsetter", "Trendsetter", "Get 50 likes on your reviews", 75],
    ["guess_master", "Guess Master", "Earn 1,000 total points", 150],
    ["rising_creator", "Rising Creator", "Post 10 reviews", 60],
  ] as const;

  const achievements = [];
  for (const [slug, name, description, points] of achievementSpecs) {
    achievements.push(
      await prisma.achievement.upsert({
        where: { slug },
        update: {},
        create: { slug, name, description, points },
      })
    );
  }
  console.log(`Seeded ${achievements.length} achievements`);
  return achievements;
}

async function seedFeatureFlags() {
  const flagSpecs = [
    ["google_auth", true, "Enable Google OAuth login"],
    ["apple_auth", false, "Enable Apple OAuth login"],
    ["tiktok_auth", false, "Enable TikTok OAuth login"],
    ["instagram_auth", false, "Enable Instagram OAuth login"],
    ["advanced_feed", true, "Enable weighted feed algorithm"],
    ["duets", true, "Enable review duets"],
    ["challenges", true, "Enable friend challenges"],
    ["creator_tipping", false, "Enable creator tipping"],
    ["leaderboard_friends", true, "Enable friends tab on leaderboard"],
    ["analytics", true, "Enable event ingestion and analytics dashboard"],
    ["result_card_layout_v2", false, "Enable dial layout A/B variant for result cards"],
    ["streak_freeze_ad_reward", false, "Earn streak freezes via rewarded ads (Phase 2)"],
    ["streak_freeze_purchase", false, "Purchase streak freezes (Phase 2)"],
    ["leagues", false, "Weekly leagues and leaderboards (Phase 2)"],
    ["rewarded_ads", false, "Rewarded ad placements (Phase 2)"],
    ["battle_pass", false, "Seasonal battle pass (Phase 3)"],
  ] as const;

  const flags = [];
  for (const [key, enabled, description] of flagSpecs) {
    flags.push(
      await prisma.featureFlag.upsert({
        where: { key },
        update: { enabled, description },
        create: { key, enabled, description },
      })
    );
  }
  console.log(`Seeded ${flags.length} feature flags`);
  return flags;
}

async function seedProducts(merchantIds: string[]) {
  const productsData = generateProducts(1000);

  // Assign ~50 products to merchant users (indices 1-3 in ALL_DEMO_USERS).
  const merchantOwnedCount = 50;
  for (let i = 0; i < merchantOwnedCount; i++) {
    const ownerIndex = i % merchantIds.length;
    productsData[i].ownerId = merchantIds[ownerIndex];
  }

  await prisma.product.createMany({ data: productsData });
  const createdProducts = await prisma.product.findMany({
    take: 1000,
    orderBy: { createdAt: "desc" },
  });
  console.log(`Seeded ${createdProducts.length} products`);
  return createdProducts;
}

async function seedReviews(users: any[], products: any[]) {
  const PUBLISHED_COUNT = 500;
  const UNDER_REVIEW_COUNT = 20;
  const now = new Date();
  const start = new Date(now.getTime() - 90 * DAY_MS);
  const recentWindow = new Date(now.getTime() - 7 * DAY_MS);

  const reviewData: any[] = [];

  // Pre-shuffle the video pool so adjacent reviews rarely share the same clip.
  const shuffledVideos = shuffleArray([...VIDEO_ASSETS]);
  let videoIndex = 0;
  const nextVideo = () => {
    const video = shuffledVideos[videoIndex % shuffledVideos.length];
    videoIndex++;
    return video;
  };

  // Ensure each of the first 12 primary demo users has at least a few published reviews.
  // Keep these recent so they reliably surface in feeds used by E2E tests.
  const primaryUsers = users.slice(0, 12);
  for (const user of primaryUsers) {
    const countForUser = randomInt(5, 8);
    for (let i = 0; i < countForUser; i++) {
      const video = nextVideo();
      const product = sample(products);
      const rating = randomInt(1, 10);
      reviewData.push({
        userId: user.id,
        productId: product.id,
        videoUrl: video.path,
        thumbnailUrl: null,
        duration: video.duration,
        format: video.format,
        rating,
        caption: `${sample(CAPTIONS)} ${product.name}`,
        productTag: product.category,
        status: "PUBLISHED",
        viewCount: randomInt(500, 20000),
        likeCount: 0,
        guessCount: 0,
        commentCount: 0,
        shareCount: randomInt(0, 150),
        exactGuessCount: 0,
        allowComments: true,
        createdAt: randomDate(recentWindow, now),
      });
    }
  }

  // Fill remaining published reviews.
  while (reviewData.length < PUBLISHED_COUNT) {
    const video = nextVideo();
    const product = sample(products);
    const user = sample(users);
    const rating = randomInt(1, 10);
    reviewData.push({
      userId: user.id,
      productId: product.id,
      videoUrl: video.path,
      thumbnailUrl: null,
      duration: video.duration,
      format: video.format,
      rating,
      caption: `${sample(CAPTIONS)} ${product.name}`,
      productTag: product.category,
      status: "PUBLISHED",
      viewCount: randomInt(500, 20000),
      likeCount: 0,
      guessCount: 0,
      commentCount: 0,
      shareCount: randomInt(0, 150),
      exactGuessCount: 0,
      allowComments: true,
      createdAt: randomDate(start, now),
    });
  }

  // Add moderation-queue reviews.
  for (let i = 0; i < UNDER_REVIEW_COUNT; i++) {
    const video = nextVideo();
    const product = sample(products);
    const user = sample(users);
    const rating = randomInt(1, 10);
    reviewData.push({
      userId: user.id,
      productId: product.id,
      videoUrl: video.path,
      thumbnailUrl: null,
      duration: video.duration,
      format: video.format,
      rating,
      caption: `${sample(CAPTIONS)} ${product.name}`,
      productTag: product.category,
      status: "UNDER_REVIEW",
      viewCount: randomInt(0, 500),
      likeCount: 0,
      guessCount: 0,
      commentCount: 0,
      shareCount: 0,
      exactGuessCount: 0,
      allowComments: true,
      createdAt: randomDate(start, now),
    });
  }

  await prisma.review.createMany({ data: reviewData });

  const reviews = await prisma.review.findMany({
    include: { product: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Seeded ${reviews.length} reviews (${PUBLISHED_COUNT} published, ${UNDER_REVIEW_COUNT} under review)`);
  return reviews;
}

async function seedLikes(users: any[], reviews: any[]) {
  const targetLikeCount = 3000;
  const likeData: any[] = [];
  const publishedReviews = reviews.filter((r) => r.status === "PUBLISHED");

  // Distribute likes roughly evenly across reviews with some variance.
  const likesPerReview = Math.max(1, Math.floor(targetLikeCount / publishedReviews.length));

  for (const review of publishedReviews) {
    const count = Math.max(0, randomInt(Math.floor(likesPerReview * 0.5), Math.floor(likesPerReview * 1.5)));
    const likers = sampleMany(users, Math.min(count, users.length - 1));
    for (const user of likers) {
      if (user.id !== review.userId) {
        likeData.push({ userId: user.id, reviewId: review.id });
      }
    }
  }

  const uniqueLikes = Array.from(new Map(likeData.map((l) => [`${l.userId}:${l.reviewId}`, l])).values());
  await prisma.like.createMany({ data: uniqueLikes, skipDuplicates: true });
  console.log(`Seeded ${uniqueLikes.length} likes`);
  return uniqueLikes.length;
}

async function seedComments(users: any[], reviews: any[]) {
  const targetCommentCount = 1500;
  const commentData: any[] = [];
  const publishedReviews = reviews.filter((r) => r.status === "PUBLISHED");
  const commentsPerReview = Math.max(1, Math.floor(targetCommentCount / publishedReviews.length));

  for (const review of publishedReviews) {
    const count = Math.max(0, randomInt(0, Math.floor(commentsPerReview * 2)));
    const commenters = sampleMany(users, Math.min(count, users.length));
    for (const user of commenters) {
      commentData.push({
        userId: user.id,
        reviewId: review.id,
        text: sample(COMMENTS),
      });
    }
  }

  await prisma.comment.createMany({ data: commentData });
  console.log(`Seeded ${commentData.length} comments`);
  return commentData.length;
}

async function seedGuesses(users: any[], reviews: any[]) {
  const targetGuessCount = 10000;
  const publishedReviews = reviews.filter((r) => r.status === "PUBLISHED");
  const guessesPerReview = Math.floor(targetGuessCount / publishedReviews.length);

  const guessData: any[] = [];
  for (const review of publishedReviews) {
    const count = Math.max(5, Math.min(40, randomInt(guessesPerReview - 5, guessesPerReview + 5)));
    const guessers = sampleMany(users.filter((u) => u.id !== review.userId), Math.min(count, users.length - 1));
    for (const user of guessers) {
      const guessed = guessRating(review.rating);
      const { score, isCorrect } = scoreForGuess(review.rating, guessed);
      guessData.push({
        userId: user.id,
        reviewId: review.id,
        guessedRating: guessed,
        isCorrect,
        score,
      });
    }
  }

  // Chunk to stay safely under Postgres parameter limits.
  const chunkSize = 2000;
  for (let i = 0; i < guessData.length; i += chunkSize) {
    const chunk = guessData.slice(i, i + chunkSize);
    await prisma.guess.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`Seeded ${guessData.length} guesses`);
  return guessData.length;
}

async function seedFollows(users: any[]) {
  const targetFollowCount = 300;
  const followData: any[] = [];

  while (followData.length < targetFollowCount) {
    const follower = sample(users);
    const following = sample(users.filter((u) => u.id !== follower.id));
    followData.push({ followerId: follower.id, followingId: following.id });
  }

  const uniqueFollows = Array.from(new Map(followData.map((f) => [`${f.followerId}:${f.followingId}`, f])).values());
  await prisma.follow.createMany({ data: uniqueFollows, skipDuplicates: true });
  console.log(`Seeded ${uniqueFollows.length} follows`);
  return uniqueFollows.length;
}

async function seedUserAchievements(users: any[], achievements: any[]) {
  const userAchievementData: any[] = [];
  for (const user of users) {
    const unlocked = sampleMany(achievements, randomInt(1, achievements.length));
    for (const achievement of unlocked) {
      userAchievementData.push({ userId: user.id, achievementId: achievement.id });
    }
  }
  await prisma.userAchievement.createMany({ data: userAchievementData, skipDuplicates: true });
  console.log(`Seeded ${userAchievementData.length} user achievements`);
}

async function seedInvites(users: any[]) {
  const inviteData: any[] = [];
  for (const user of users) {
    const codeCount = randomInt(1, 4);
    for (let i = 0; i < codeCount; i++) {
      inviteData.push({
        code: `${user.username}-${randomString(8)}`,
        inviterId: user.id,
        clicks: randomInt(0, 50),
      });
    }
  }
  await prisma.invite.createMany({ data: inviteData });
  console.log(`Seeded ${inviteData.length} invite codes`);
}

async function seedChallenges(users: any[]) {
  const challengeNames = [
    "Weekend Guess-Off",
    "Creator Clash",
    "Streak Showdown",
    "Rating Rumble",
    "Top Reviewer",
    "Guess Master",
    "Like Leader",
    "Comment Champion",
    "Daily Drop Duel",
    "Perfect 10 Hunt",
  ];

  const now = new Date();

  // 30 open challenges
  for (let i = 0; i < 30; i++) {
    const creator = sample(users);
    const participants = sampleMany(users.filter((u) => u.id !== creator.id), randomInt(2, 8));
    const expiresAt = new Date(now.getTime() + randomInt(1, 14) * DAY_MS);
    await prisma.challenge.create({
      data: {
        type: "GENERIC",
        creatorId: creator.id,
        name: sample(challengeNames),
        description: "Who can rack up the most points before time runs out?",
        expiresAt,
        status: "ACTIVE",
        participants: {
          create: participants.map((p) => ({
            userId: p.id,
            score: randomInt(0, 800),
          })),
        },
      },
    });
  }

  // 20 expired challenges
  for (let i = 0; i < 20; i++) {
    const creator = sample(users);
    const participants = sampleMany(users.filter((u) => u.id !== creator.id), randomInt(2, 8));
    const expiresAt = new Date(now.getTime() - randomInt(1, 60) * DAY_MS);
    await prisma.challenge.create({
      data: {
        type: "GENERIC",
        creatorId: creator.id,
        name: sample(challengeNames),
        description: "Who could rack up the most points before time ran out?",
        expiresAt,
        status: "EXPIRED",
        participants: {
          create: participants.map((p) => ({
            userId: p.id,
            score: randomInt(0, 1200),
          })),
        },
      },
    });
  }
  console.log("Seeded 50 challenges (30 active, 20 expired)");
}

async function seedNotifications(users: any[]) {
  const notificationTypes = [
    "LIKE",
    "COMMENT",
    "FOLLOW",
    "ACHIEVEMENT",
    "CHALLENGE_RECEIVED",
    "DAILY_DROP",
    "STREAK_AT_RISK",
    "CHALLENGE_BEAT",
  ] as const;

  const titles: Record<string, string> = {
    LIKE: "New like on your review",
    COMMENT: "New comment",
    FOLLOW: "New follower",
    ACHIEVEMENT: "Achievement unlocked!",
    CHALLENGE_RECEIVED: "New challenge received",
    DAILY_DROP: "Daily Drop is ready",
    STREAK_AT_RISK: "Streak at risk!",
    CHALLENGE_BEAT: "You were beaten in a challenge",
  };

  const bodies: Record<string, string> = {
    LIKE: "Someone liked your latest review.",
    COMMENT: "Someone left a comment on your review.",
    FOLLOW: "You have a new follower.",
    ACHIEVEMENT: "You unlocked a new achievement!",
    CHALLENGE_RECEIVED: "A friend challenged you to a guess-off.",
    DAILY_DROP: "Today's Daily Drop is waiting for your guess.",
    STREAK_AT_RISK: "Guess today to keep your streak alive.",
    CHALLENGE_BEAT: "A friend just beat your challenge score.",
  };

  const notificationData: any[] = [];
  const target = 200;
  while (notificationData.length < target) {
    const user = sample(users);
    const type = sample(notificationTypes);
    notificationData.push({
      userId: user.id,
      type,
      title: titles[type],
      body: bodies[type],
      data: { type },
      readAt: chance(0.5) ? new Date() : null,
    });
  }

  await prisma.notification.createMany({ data: notificationData });
  console.log(`Seeded ${notificationData.length} notifications`);
}

async function updateReviewDenormalizedCounts(reviews: any[]) {
  const [guessCounts, likeCounts, commentCounts, exactGuessCounts] = await Promise.all([
    prisma.guess.groupBy({ by: ["reviewId"], _count: true }),
    prisma.like.groupBy({ by: ["reviewId"], _count: true }),
    prisma.comment.groupBy({ by: ["reviewId"], _count: true }),
    prisma.guess.groupBy({ by: ["reviewId"], where: { isCorrect: true }, _count: true }),
  ]);

  const guessMap = new Map(guessCounts.map((g) => [g.reviewId, g._count]));
  const likeMap = new Map(likeCounts.map((l) => [l.reviewId, l._count]));
  const commentMap = new Map(commentCounts.map((c) => [c.reviewId, c._count]));
  const exactMap = new Map(exactGuessCounts.map((g) => [g.reviewId, g._count]));

  await Promise.all(
    reviews.map((review) =>
      prisma.review.update({
        where: { id: review.id },
        data: {
          guessCount: guessMap.get(review.id) ?? 0,
          likeCount: likeMap.get(review.id) ?? 0,
          commentCount: commentMap.get(review.id) ?? 0,
          exactGuessCount: exactMap.get(review.id) ?? 0,
        },
      })
    )
  );
  console.log("Updated review denormalized counts");
}

async function seedContentCuration() {
  // Query fresh reviews so denormalized counts reflect seeded engagement.
  const publishedReviews = await prisma.review.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    include: { product: true, _count: { select: { guesses: true } } },
  });
  const reviewsWithGuesses = publishedReviews.filter((r) => (r._count?.guesses ?? 0) > 0 || r.guessCount > 0);
  const reviewIds = reviewsWithGuesses.map((r) => r.id);
  const distributions = await buildGuessDistributions(reviewIds);

  const scored = reviewsWithGuesses.map((review) => ({
    reviewId: review.id,
    score: computeGuessabilityScore(review, distributions.get(review.id)),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 200);
  await prisma.contentCuration.createMany({
    data: top.map((item) => ({
      reviewId: item.reviewId,
      guessabilityScore: item.score,
      status: "CANDIDATE",
    })),
  });
  console.log(`Seeded ${top.length} content curation rows`);
  return top;
}

async function seedDailyDrops(curated: any[]) {
  const today = toUTCDate(new Date());
  const dates: Date[] = [];
  // Past 30 days + next 90 days = 120 drops
  for (let i = -30; i < 90; i++) {
    dates.push(new Date(today.getTime() + i * DAY_MS));
  }

  const usedReviewIds = new Set<string>();
  const assignments: { reviewId: string; date: Date }[] = [];

  for (const date of dates) {
    const next = curated.find((c) => !usedReviewIds.has(c.reviewId));
    if (!next) break;
    usedReviewIds.add(next.reviewId);
    assignments.push({ reviewId: next.reviewId, date });
  }

  if (assignments.length === 0) {
    console.log("No curated reviews available for Daily Drops");
    return;
  }

  // Build a map from reviewId to curation id so we can mark used curations SCHEDULED.
  const curations = await prisma.contentCuration.findMany({
    where: { reviewId: { in: assignments.map((a) => a.reviewId) } },
  });
  const curationByReviewId = new Map(curations.map((c) => [c.reviewId, c.id]));

  await prisma.$transaction(
    async (tx) => {
      for (const { reviewId, date } of assignments) {
        await tx.dailyDrop.create({ data: { date, reviewId } });
        const curationId = curationByReviewId.get(reviewId);
        if (curationId) {
          await tx.contentCuration.update({
            where: { id: curationId },
            data: { status: "SCHEDULED", scheduledDate: date },
          });
        }
      }
    },
    { maxWait: 30000, timeout: 120000 }
  );

  console.log(`Scheduled ${assignments.length} Daily Drops (past 30 days + next 90 days)`);
}

async function seedEventsAndRollup() {
  const ANALYTICS_USERS = 100;
  const DAYS = 90;
  const now = new Date();
  const start = new Date(now.getTime() - DAYS * DAY_MS);

  console.log(`Creating ${ANALYTICS_USERS} synthetic analytics users...`);
  const analyticsUserData: any[] = [];
  const timestamp = Date.now();
  for (let i = 0; i < ANALYTICS_USERS; i++) {
    const createdAt = randomDate(start, now);
    analyticsUserData.push({
      email: `analytics-seed-${timestamp}-${i}@silentreview.app`,
      username: `analyticuser${timestamp}${i}`,
      passwordHash: "sealed",
      createdAt,
      lastActiveAt: createdAt,
    });
  }

  await prisma.user.createMany({ data: analyticsUserData });
  const analyticsUsers = await prisma.user.findMany({
    where: { email: { startsWith: "analytics-seed-" } },
    select: { id: true, createdAt: true },
  });

  const channels = ["organic", "challenge_link", "result_card", "creator_link"] as const;
  const BATCH_SIZE = 500;
  const eventsBatch: any[] = [];
  let totalEvents = 0;
  const userUpdates: { id: string; streakDays: number; longestStreak: number; lastActiveAt: Date }[] = [];

  for (const user of analyticsUsers) {
    const channel = sample(channels);
    const signupDay = toUTCDate(new Date(user.createdAt));
    const sessionId = `sess-${user.id.slice(0, 8)}`;

    let firstRoundDone = false;
    let activeDays = 0;
    let streak = 0;
    let maxStreak = 0;

    for (let dayOffset = 0; dayOffset <= DAYS; dayOffset++) {
      const dayStart = new Date(signupDay.getTime() + dayOffset * DAY_MS);
      if (dayStart > now) break;

      let activeProbability = dayOffset === 0 ? 1 : 0.35 * Math.pow(0.85, dayOffset);
      if (streak > 0) activeProbability += 0.15;
      if (activeProbability > 1) activeProbability = 1;

      if (!chance(activeProbability)) {
        streak = 0;
        continue;
      }

      activeDays++;
      streak++;
      if (streak > maxStreak) maxStreak = streak;

      const sessionEvents = randomInt(1, 4);
      for (let s = 0; s < sessionEvents; s++) {
        const eventTime = new Date(dayStart.getTime() + randomInt(0, DAY_MS - 1));
        const dateKey = (d: Date) => d.toISOString().slice(0, 10);

        eventsBatch.push({
          type: "app_open",
          userId: user.id,
          sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
          channel,
          properties: { dayOffset },
          createdAt: eventTime,
        });

        if (!firstRoundDone) {
          eventsBatch.push({
            type: "first_round_complete",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: { dayOffset },
            createdAt: new Date(eventTime.getTime() + randomInt(5_000, 30_000)),
          });
          firstRoundDone = true;
        }

        const guesses = randomInt(1, 3);
        for (let g = 0; g < guesses; g++) {
          eventsBatch.push({
            type: "guess_submitted",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: { score: sample([10, 5, 5, 2, 2, 0]) },
            createdAt: new Date(eventTime.getTime() + randomInt(30_000, 120_000) + g * 10_000),
          });
        }

        if (chance(0.3)) {
          eventsBatch.push({
            type: "daily_drop_played",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: {},
            createdAt: new Date(eventTime.getTime() + randomInt(60_000, 180_000)),
          });
        }

        if (chance(0.08)) {
          eventsBatch.push({
            type: "share_card_created",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: { platform: sample(["tiktok", "copy", "native", "download"]) },
            createdAt: new Date(eventTime.getTime() + randomInt(60_000, 180_000)),
          });
          if (chance(0.7)) {
            eventsBatch.push({
              type: "share_card_clicked",
              userId: user.id,
              sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
              channel,
              properties: { platform: sample(["copy", "native"]) },
              createdAt: new Date(eventTime.getTime() + randomInt(60_000, 180_000) + 5_000),
            });
          }
        }
      }

      if (streak === 7 && dayOffset <= 13) {
        eventsBatch.push({
          type: "streak_milestone",
          userId: user.id,
          sessionId,
          channel,
          properties: { milestone: 7, streakDays: streak },
          createdAt: new Date(dayStart.getTime() + randomInt(0, DAY_MS - 1)),
        });
      }

      if (eventsBatch.length >= BATCH_SIZE) {
        await prisma.event.createMany({ data: eventsBatch });
        totalEvents += eventsBatch.length;
        eventsBatch.length = 0;
      }
    }

    if (chance(0.25)) {
      const inviteCode = `invite-${user.id.slice(0, 8)}`;
      eventsBatch.push({
        type: "invite_sent",
        userId: user.id,
        sessionId,
        channel,
        properties: { code: inviteCode },
        createdAt: new Date(user.createdAt.getTime() + randomInt(1 * DAY_MS, 7 * DAY_MS)),
      });
      if (chance(0.4)) {
        eventsBatch.push({
          type: "invite_install_attributed",
          userId: user.id,
          sessionId,
          channel,
          properties: { inviteCode },
          createdAt: new Date(user.createdAt.getTime() + randomInt(2 * DAY_MS, 14 * DAY_MS)),
        });
      }
    }

    if (chance(0.15)) {
      eventsBatch.push({
        type: "challenge_sent",
        userId: user.id,
        sessionId,
        channel,
        properties: {},
        createdAt: new Date(user.createdAt.getTime() + randomInt(1 * DAY_MS, 7 * DAY_MS)),
      });
    }
    if (chance(0.1)) {
      eventsBatch.push({
        type: "challenge_accepted",
        userId: user.id,
        sessionId,
        channel,
        properties: {},
        createdAt: new Date(user.createdAt.getTime() + randomInt(1 * DAY_MS, 14 * DAY_MS)),
      });
    }

    userUpdates.push({
      id: user.id,
      streakDays: maxStreak,
      longestStreak: maxStreak,
      lastActiveAt: new Date(user.createdAt.getTime() + activeDays * DAY_MS),
    });

    if (userUpdates.length >= 25) {
      await flushUserUpdates(userUpdates);
    }

    if (eventsBatch.length >= BATCH_SIZE) {
      await prisma.event.createMany({ data: eventsBatch });
      totalEvents += eventsBatch.length;
      eventsBatch.length = 0;
    }
  }

  if (eventsBatch.length > 0) {
    await prisma.event.createMany({ data: eventsBatch });
    totalEvents += eventsBatch.length;
    eventsBatch.length = 0;
  }

  if (userUpdates.length > 0) {
    await flushUserUpdates(userUpdates);
  }

  console.log(`Seeded ${totalEvents} analytics events across ${ANALYTICS_USERS} synthetic users`);

  console.log("Running nightly rollup for last 90 days...");
  for (let d = 0; d < DAYS; d++) {
    const date = new Date(start.getTime() + d * DAY_MS);
    await runDailyRollup(date);
  }
  console.log("Analytics rollup complete");
}

async function flushUserUpdates(updates: { id: string; streakDays: number; longestStreak: number; lastActiveAt: Date }[]) {
  await Promise.all(
    updates.map((u) =>
      prisma.user.update({
        where: { id: u.id },
        data: {
          streakDays: u.streakDays,
          longestStreak: u.longestStreak,
          lastActiveAt: u.lastActiveAt,
        },
      })
    )
  );
  updates.length = 0;
}

async function updateUserStats(users: any[]) {
  const [reviewCounts, guessStats, likeCounts] = await Promise.all([
    prisma.review.groupBy({ by: ["userId"], _count: true }),
    prisma.guess.groupBy({ by: ["userId"], _sum: { score: true }, _count: true }),
    prisma.like.groupBy({ by: ["userId"], _count: true }),
  ]);

  const reviewMap = new Map(reviewCounts.map((r) => [r.userId, r._count]));
  const guessMap = new Map(guessStats.map((g) => [g.userId, { count: g._count, points: g._sum.score ?? 0 }]));
  const likeMap = new Map(likeCounts.map((l) => [l.userId, l._count]));

  await Promise.all(
    users.map((user) => {
      const reviewCount = reviewMap.get(user.id) ?? 0;
      const guessStat = guessMap.get(user.id) ?? { count: 0, points: 0 };
      const likeCount = likeMap.get(user.id) ?? 0;
      const totalPoints = guessStat.points + reviewCount * 25 + likeCount * 2;

      return prisma.user.update({
        where: { id: user.id },
        data: {
          totalReviews: reviewCount,
          totalGuesses: guessStat.count,
          totalLikes: likeCount,
          totalPoints,
          lastActiveAt: new Date(Date.now() - randomInt(0, 7) * DAY_MS),
        },
      });
    })
  );
  console.log("Updated demo user stats");
}

async function main() {
  // 1. Seed demo users first (upsert to preserve deterministic credentials)
  const demoPassword = await hashPassword(DEMO_PASSWORD);
  const users = await seedDemoUsers(demoPassword);

  // 2. Seed achievements
  const achievements = await seedAchievements();

  // 3. Seed feature flags
  await seedFeatureFlags();

  // 4. Clear old seeded dynamic data (demo users themselves are preserved)
  await clearSeededData();

  // 5. Seed products, assigning ~50 to merchant users
  const merchantIds = users.filter((u) => u.role === "MERCHANT").map((u) => u.id);
  const products = await seedProducts(merchantIds);

  // 6. Seed 500 published + 20 under-review reviews
  const reviews = await seedReviews(users, products);

  // 7. Seed engagement
  await seedLikes(users, reviews);
  await seedComments(users, reviews);
  await seedGuesses(users, reviews);

  // 8. Seed follows
  await seedFollows(users);

  // 9. Seed user achievements and invites
  await seedUserAchievements(users, achievements);
  await seedInvites(users);

  // 10. Seed challenges
  await seedChallenges(users);

  // 11. Seed notifications
  await seedNotifications(users);

  // 12. Update denormalized review counts before curation (scores need accurate data)
  await updateReviewDenormalizedCounts(reviews);

  // 13. Seed content curation and daily drops
  const curated = await seedContentCuration();
  await seedDailyDrops(curated);

  // 14. Seed analytics events and rollup
  await seedEventsAndRollup();

  // 15. Update denormalized demo user stats
  await updateUserStats(users);

  console.log("\nDemo login credentials (password: DemoPass123!):");
  for (const [email, username, displayName] of ALL_DEMO_USERS) {
    console.log(`  ${email} (${username}) — ${displayName}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
