import bcrypt from "bcryptjs";
import { prisma } from "../src/client.js";

const SALT_ROUNDS = 12;

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

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

async function main() {
  // 1. Seed demo users
  const demoPassword = await hashPassword("DemoPass123!");
  const users = [];
  for (const [email, username, displayName] of [
    ["demo@silentreview.app", "demouser", "Demo User"],
    ["alice@silentreview.app", "alice", "Alice"],
    ["bob@silentreview.app", "bob", "Bob"],
  ] as const) {
    users.push(
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          username,
          displayName,
          passwordHash: demoPassword,
          emailVerified: true,
          totalPoints: Math.floor(Math.random() * 1000),
          streakDays: Math.floor(Math.random() * 30),
        },
      })
    );
  }
  console.log(`Seeded ${users.length} demo users`);

  // 2. Seed achievements
  const achievements = [];
  for (const [slug, name, description, points] of [
    ["first_guess", "First Guess", "Submit your first rating guess", 10],
    ["first_review", "First Review", "Post your first silent review", 25],
    ["exact_10", "Perfect 10", "Make 10 exact guesses", 50],
    ["streak_7", "Week Streak", "Maintain a 7-day streak", 100],
    ["social_butterfly", "Social Butterfly", "Follow 10 users", 30],
  ] as const) {
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
  const flags = [];
  for (const [key, enabled, description] of [
    ["google_auth", true, "Enable Google OAuth login"],
    ["apple_auth", false, "Enable Apple OAuth login"],
    ["tiktok_auth", false, "Enable TikTok OAuth login"],
    ["instagram_auth", false, "Enable Instagram OAuth login"],
    ["advanced_feed", true, "Enable weighted feed algorithm"],
    ["duets", false, "Enable review duets"],
    ["challenges", false, "Enable friend challenges"],
    ["creator_tipping", false, "Enable creator tipping"],
  ] as const) {
    flags.push(
      await prisma.featureFlag.upsert({
        where: { key },
        update: {},
        create: { key, enabled, description },
      })
    );
  }
  console.log(`Seeded ${flags.length} feature flags`);

  // 4. Seed 1,000 products across 10 categories
  const productsData = generateProducts(1000);
  await prisma.product.createMany({ data: productsData });
  const createdProducts = await prisma.product.findMany({
    take: 1000,
    orderBy: { createdAt: "desc" },
  });
  console.log(`Seeded ${createdProducts.length} products`);

  // 5. Seed a handful of reviews and guesses
  const demoUser = users[0];
  const alice = users[1];
  const bob = users[2];

  const reviews = [];
  for (let i = 0; i < 5; i++) {
    const product = sample(createdProducts);
    const review = await prisma.review.create({
      data: {
        userId: demoUser.id,
        productId: product.id,
        videoUrl: "/uploads/placeholder-review.webm",
        thumbnailUrl: null,
        duration: 5.0,
        format: "video/webm",
        rating: Math.floor(Math.random() * 10) + 1,
        caption: `My take on the ${product.name}`,
        productTag: product.category,
        status: "PUBLISHED",
        viewCount: Math.floor(Math.random() * 500),
        likeCount: Math.floor(Math.random() * 50),
        guessCount: 2,
        commentCount: 0,
        shareCount: Math.floor(Math.random() * 10),
      },
    });
    reviews.push(review);
  }

  for (const review of reviews) {
    for (const user of [alice, bob]) {
      const guessed = Math.floor(Math.random() * 10) + 1;
      const diff = Math.abs(guessed - review.rating);
      const score = diff === 0 ? 10 : diff === 1 ? 5 : diff === 2 ? 2 : 0;
      await prisma.guess.upsert({
        where: {
          userId_reviewId: {
            userId: user.id,
            reviewId: review.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          reviewId: review.id,
          guessedRating: guessed,
          isCorrect: diff === 0,
          score,
        },
      });
    }
  }
  console.log(`Seeded ${reviews.length} reviews and guesses`);

  console.log("\nDemo login credentials:");
  console.log("  demo@silentreview.app / DemoPass123!");
  console.log("  alice@silentreview.app / DemoPass123!");
  console.log("  bob@silentreview.app / DemoPass123!");
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
