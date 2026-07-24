import bcrypt from "bcryptjs";
import { prisma } from "../src/client.js";

const SALT_ROUNDS = 12;

const DEMO_PASSWORD = "DemoPass123!";

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
];

interface VideoAsset {
  path: string;
  format: "video/webm" | "video/mp4";
  duration: number;
  category: string;
}

const VIDEO_ASSETS: VideoAsset[] = [
  { path: "/uploads/placeholder-review.webm", format: "video/webm", duration: 5, category: "Home" },
  { path: "/uploads/review-2.webm", format: "video/webm", duration: 10, category: "Electronics" },
  { path: "/uploads/review-3.webm", format: "video/webm", duration: 15, category: "Sports" },
  { path: "/uploads/review-road-20s.webm", format: "video/webm", duration: 20, category: "Automotive" },
  { path: "/uploads/review-road-30s.webm", format: "video/webm", duration: 30, category: "Automotive" },
  { path: "/uploads/review-nature-park.mp4", format: "video/mp4", duration: 10, category: "Home" },
  { path: "/uploads/review-food-cooking.mp4", format: "video/mp4", duration: 10, category: "Food" },
  { path: "/uploads/review-tech-laptop.mp4", format: "video/mp4", duration: 10, category: "Electronics" },
  { path: "/uploads/review-fashion-walk.mp4", format: "video/mp4", duration: 10, category: "Fashion" },
  { path: "/uploads/review-city-traffic.mp4", format: "video/mp4", duration: 10, category: "Automotive" },
  { path: "/uploads/review-people-talk.mp4", format: "video/mp4", duration: 10, category: "Beauty" },
  { path: "/uploads/review-travel-beach.mp4", format: "video/mp4", duration: 10, category: "Sports" },
  { path: "/uploads/review-coffee-pour.mp4", format: "video/mp4", duration: 10, category: "Food" },
  { path: "/uploads/review-phone-hands.mp4", format: "video/mp4", duration: 10, category: "Electronics" },
  { path: "/uploads/review-woman-smile.mp4", format: "video/mp4", duration: 10, category: "Beauty" },
  { path: "/uploads/review-gym-workout.mp4", format: "video/mp4", duration: 10, category: "Sports" },
  { path: "/uploads/review-books-read.mp4", format: "video/mp4", duration: 10, category: "Books" },
];

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
];

const DEMO_USERS: [string, string, string][] = [
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

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleMany<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
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
    '"Review"',
    '"Product"',
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE;`);
  }
  console.log("Cleared old seeded demo data");
}

async function main() {
  // 1. Seed demo users
  const demoPassword = await hashPassword(DEMO_PASSWORD);
  const userInputs = DEMO_USERS.map(([email, username, displayName], index) => ({
    email,
    username,
    displayName,
    passwordHash: demoPassword,
    emailVerified: true,
    bio: sample(BIOS),
    avatarUrl: null,
    totalPoints: randomInt(50, 5000),
    streakDays: randomInt(0, 45),
    longestStreak: randomInt(0, 60),
    role: index === 0 ? "ADMIN" : ("USER" as const),
  }));

  const users = [];
  for (const input of userInputs) {
    users.push(
      await prisma.user.upsert({
        where: { email: input.email },
        update: {},
        create: input,
      })
    );
  }
  console.log(`Seeded ${users.length} demo users`);

  // 2. Seed achievements
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

  // 3. Seed feature flags
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
  ] as const;

  const flags = [];
  for (const [key, enabled, description] of flagSpecs) {
    flags.push(
      await prisma.featureFlag.upsert({
        where: { key },
        update: {},
        create: { key, enabled, description },
      })
    );
  }
  console.log(`Seeded ${flags.length} feature flags`);

  // 4. Clear old seeded dynamic data and seed fresh products
  await clearSeededData();

  const productsData = generateProducts(1000);
  await prisma.product.createMany({ data: productsData });
  const createdProducts = await prisma.product.findMany({
    take: 1000,
    orderBy: { createdAt: "desc" },
  });
  console.log(`Seeded ${createdProducts.length} products`);

  // 5. Seed reviews
  const REVIEW_COUNT = 60;
  const reviews = [];
  for (let i = 0; i < REVIEW_COUNT; i++) {
    const video = VIDEO_ASSETS[i % VIDEO_ASSETS.length];
    const product = sample(createdProducts);
    const user = sample(users);
    const rating = randomInt(1, 10);
    const viewCount = randomInt(500, 15000);
    const likeCount = randomInt(10, Math.min(viewCount / 5, 800));
    const guessCount = randomInt(5, Math.min(viewCount / 8, 400));
    const commentCount = randomInt(0, 40);
    const shareCount = randomInt(0, 100);

    const review = await prisma.review.create({
      data: {
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
        viewCount,
        likeCount,
        guessCount,
        commentCount,
        shareCount,
        exactGuessCount: randomInt(0, Math.floor(guessCount / 4)),
      },
    });
    reviews.push(review);
  }
  console.log(`Seeded ${reviews.length} reviews`);

  // 6. Seed likes
  const likeData = [];
  for (const review of reviews) {
    const likerCount = randomInt(0, Math.min(15, review.likeCount));
    const likers = sampleMany(users, likerCount);
    for (const user of likers) {
      if (user.id !== review.userId) {
        likeData.push({ userId: user.id, reviewId: review.id });
      }
    }
  }
  // Deduplicate
  const uniqueLikes = Array.from(new Map(likeData.map((l) => [`${l.userId}:${l.reviewId}`, l])).values());
  await prisma.like.createMany({ data: uniqueLikes, skipDuplicates: true });
  console.log(`Seeded ${uniqueLikes.length} likes`);

  // 7. Seed comments
  const commentsData = [];
  for (const review of reviews) {
    const commentCount = randomInt(0, Math.min(8, review.commentCount));
    const commenters = sampleMany(users, commentCount);
    for (const user of commenters) {
      commentsData.push({
        userId: user.id,
        reviewId: review.id,
        text: sample(COMMENTS),
      });
    }
  }
  await prisma.comment.createMany({ data: commentsData });
  console.log(`Seeded ${commentsData.length} comments`);

  // 8. Seed guesses
  const guessData = [];
  for (const review of reviews) {
    const guesserCount = randomInt(1, Math.min(25, review.guessCount));
    const guessers = sampleMany(users, guesserCount);
    for (const user of guessers) {
      if (user.id === review.userId) continue;
      const guessed = randomInt(1, 10);
      const diff = Math.abs(guessed - review.rating);
      const score = diff === 0 ? 10 : diff === 1 ? 5 : diff === 2 ? 2 : 0;
      guessData.push({
        userId: user.id,
        reviewId: review.id,
        guessedRating: guessed,
        isCorrect: diff === 0,
        score,
      });
    }
  }
  await prisma.guess.createMany({ data: guessData });
  console.log(`Seeded ${guessData.length} guesses`);

  // 9. Seed follows
  const followData = [];
  for (const follower of users) {
    const followingCount = randomInt(1, Math.min(8, users.length - 1));
    const following = sampleMany(
      users.filter((u) => u.id !== follower.id),
      followingCount
    );
    for (const target of following) {
      followData.push({ followerId: follower.id, followingId: target.id });
    }
  }
  const uniqueFollows = Array.from(new Map(followData.map((f) => [`${f.followerId}:${f.followingId}`, f])).values());
  await prisma.follow.createMany({ data: uniqueFollows, skipDuplicates: true });
  console.log(`Seeded ${uniqueFollows.length} follows`);

  // 10. Seed user achievements
  const userAchievementData = [];
  for (const user of users) {
    const unlocked = sampleMany(achievements, randomInt(1, achievements.length));
    for (const achievement of unlocked) {
      userAchievementData.push({ userId: user.id, achievementId: achievement.id });
    }
  }
  await prisma.userAchievement.createMany({ data: userAchievementData, skipDuplicates: true });
  console.log(`Seeded ${userAchievementData.length} user achievements`);

  // 11. Seed invite codes
  const inviteData = [];
  for (const user of users) {
    const codeCount = randomInt(1, 4);
    for (let i = 0; i < codeCount; i++) {
      inviteData.push({
        code: `${user.username}-${Math.random().toString(36).slice(2, 10)}`,
        inviterId: user.id,
        clicks: randomInt(0, 50),
      });
    }
  }
  await prisma.invite.createMany({ data: inviteData });
  console.log(`Seeded ${inviteData.length} invite codes`);

  // 12. Seed challenges
  const challengeSpecs = [
    { name: "Weekend Guess-Off", description: "Who can make the most exact guesses this weekend?" },
    { name: "Creator Clash", description: "Post reviews and rack up likes to win." },
    { name: "Streak Showdown", description: "Keep your daily streak alive the longest." },
  ];
  for (const spec of challengeSpecs) {
    const creator = sample(users);
    const participants = sampleMany(users.filter((u) => u.id !== creator.id), randomInt(2, 6));
    const challenge = await prisma.challenge.create({
      data: {
        creatorId: creator.id,
        name: spec.name,
        description: spec.description,
        expiresAt: new Date(Date.now() + randomInt(1, 14) * 24 * 60 * 60 * 1000),
        participants: {
          create: participants.map((p) => ({
            userId: p.id,
            score: randomInt(0, 500),
          })),
        },
      },
    });
    console.log(`Seeded challenge: ${challenge.name}`);
  }

  // 13. Seed notifications
  const notificationData = [];
  for (const user of users) {
    const notifCount = randomInt(0, 5);
    for (let i = 0; i < notifCount; i++) {
      const type = sample(["LIKE", "COMMENT", "FOLLOW", "ACHIEVEMENT"] as const);
      notificationData.push({
        userId: user.id,
        type,
        title: type === "LIKE" ? "New like on your review" : type === "COMMENT" ? "New comment" : type === "FOLLOW" ? "New follower" : "Achievement unlocked!",
        body: "Check it out in the app.",
        readAt: Math.random() > 0.5 ? new Date() : null,
      });
    }
  }
  await prisma.notification.createMany({ data: notificationData });
  console.log(`Seeded ${notificationData.length} notifications`);

  // 14. Update denormalized user stats
  for (const user of users) {
    const reviewCount = await prisma.review.count({ where: { userId: user.id } });
    const guessCount = await prisma.guess.count({ where: { userId: user.id } });
    const likeCount = await prisma.like.count({ where: { user: { id: user.id } } });
    const followerCount = await prisma.follow.count({ where: { followingId: user.id } });
    const totalPoints = guessCount * 5 + reviewCount * 25 + likeCount * 2 + randomInt(0, 200);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalReviews: reviewCount,
        totalGuesses: guessCount,
        totalLikes: likeCount,
        totalPoints,
        lastActiveAt: new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("Updated user stats");

  console.log("\nDemo login credentials (password: DemoPass123!):");
  for (const [email, username, displayName] of DEMO_USERS) {
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
