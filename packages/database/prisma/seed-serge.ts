import bcrypt from "bcryptjs";
import { prisma } from "../src/client.js";

const SALT_ROUNDS = 12;
const PASSWORD = "DemoPass123!";

const SERGE = {
  email: "serge@silentreview.app",
  username: "serge",
  displayName: "Serge",
  bio: "Product reviewer, guesser, and streak chaser.",
  role: "USER" as const,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomRating() {
  return Math.floor(Math.random() * 10) + 1;
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function main() {
  const force = process.argv.includes("--force");
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  let serge = await prisma.user.findUnique({ where: { username: SERGE.username } });

  if (serge) {
    const reviewCount = await prisma.review.count({ where: { userId: serge.id, deletedAt: null } });
    if (reviewCount > 0 && !force) {
      console.log(`@serge already has ${reviewCount} reviews. Use --force to reseed.`);
      return;
    }
    if (force) {
      console.log("Deleting existing @serge activity...");
      await prisma.user.delete({ where: { id: serge.id } });
      serge = null;
    }
  }

  if (!serge) {
    serge = await prisma.user.create({
      data: {
        ...SERGE,
        passwordHash,
        emailVerified: true,
        streakDays: 5,
        longestStreak: 12,
        totalPoints: 340,
        totalGuesses: 0,
        totalReviews: 0,
        totalLikes: 0,
        lastActiveAt: new Date(),
      },
    });
    console.log("Created @serge:", serge.id);
  }

  const [products, users, publishedReviews, achievements] = await Promise.all([
    prisma.product.findMany({ where: { deletedAt: null }, take: 20 }),
    prisma.user.findMany({ where: { deletedAt: null, id: { not: serge.id } }, take: 20 }),
    prisma.review.findMany({
      where: { status: "PUBLISHED", deletedAt: null, user: { deletedAt: null } },
      take: 30,
      include: { user: { select: { id: true } } },
    }),
    prisma.achievement.findMany({ take: 10 }),
  ]);

  if (products.length < 5 || users.length < 5 || publishedReviews.length < 10) {
    console.warn("Not enough existing data to seed realistic activity.");
    return;
  }

  // 1. Reviews by Serge
  const reviewProducts = pickMany(products, 4);
  const sergeReviews = await Promise.all(
    reviewProducts.map((product, i) =>
      prisma.review.create({
        data: {
          userId: serge.id,
          productId: product.id,
          videoUrl: `/uploads/seed/seed-${(i + 3) % 20}.mp4`,
          thumbnailUrl: null,
          duration: 5,
          format: "video/mp4",
          rating: randomRating(),
          caption: `My honest take on the ${product.name}. What do you think?`,
          productTag: product.category,
          status: "PUBLISHED",
        },
      })
    )
  );
  console.log(`Created ${sergeReviews.length} reviews for @serge`);

  // 2. Guesses by Serge on others' reviews
  const guessTargets = publishedReviews.filter((r) => r.userId !== serge.id).slice(0, 12);
  await Promise.all(
    guessTargets.map((review) =>
      prisma.guess.create({
        data: {
          userId: serge.id,
          reviewId: review.id,
          guessedRating: randomRating(),
          isCorrect: false,
          score: Math.random() > 0.5 ? 10 : 5,
          createdAt: hoursAgo(Math.floor(Math.random() * 72)),
        },
      })
    )
  );
  console.log(`Created ${guessTargets.length} guesses for @serge`);

  // 3. Likes by Serge
  const likeTargets = publishedReviews.filter((r) => r.userId !== serge.id).slice(0, 8);
  await Promise.all(
    likeTargets.map((review) =>
      prisma.like.create({
        data: {
          userId: serge.id,
          reviewId: review.id,
          createdAt: hoursAgo(Math.floor(Math.random() * 96)),
        },
      })
    )
  );
  console.log(`Created ${likeTargets.length} likes for @serge`);

  // 4. Comments by Serge
  const commentTargets = publishedReviews.filter((r) => r.userId !== serge.id).slice(0, 6);
  const comments = [
    "Totally agree with this rating.",
    "I would have gone one point lower.",
    "This product is underrated.",
    "Great review, super helpful.",
    "Hmm, not convinced.",
    "Adding this to my wishlist.",
  ];
  await Promise.all(
    commentTargets.map((review, i) =>
      prisma.comment.create({
        data: {
          userId: serge.id,
          reviewId: review.id,
          text: comments[i % comments.length],
          createdAt: hoursAgo(Math.floor(Math.random() * 48)),
        },
      })
    )
  );
  console.log(`Created ${commentTargets.length} comments for @serge`);

  // 5. Follows
  const followTargets = pickMany(users.filter((u) => u.id !== serge.id), 3);
  await Promise.all(
    followTargets.map((user) =>
      prisma.follow.create({
        data: { followerId: serge.id, followingId: user.id },
      })
    )
  );
  const followerSources = pickMany(users.filter((u) => u.id !== serge.id), 2);
  await Promise.all(
    followerSources.map((user) =>
      prisma.follow.create({
        data: { followerId: user.id, followingId: serge.id },
      })
    )
  );
  console.log("Created follow relationships for @serge");

  // 6. Achievements
  const achievementSlugs = ["first-guess", "streak-7", "social-butterfly"];
  for (const slug of achievementSlugs) {
    let achievement = await prisma.achievement.findUnique({ where: { slug } });
    if (!achievement) {
      achievement = await prisma.achievement.create({
        data: {
          slug,
          name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          description: "Demo achievement",
          points: 50,
        },
      });
    }
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: serge.id, achievementId: achievement.id } },
      create: { userId: serge.id, achievementId: achievement.id },
      update: {},
    });
  }
  console.log("Awarded achievements to @serge");

  // 7. Notifications for Serge
  const notificationSenders = pickMany(users, 6);
  const notificationRows = [
    { type: "LIKE", title: "New like", body: `${notificationSenders[0].displayName ?? notificationSenders[0].username} liked your review.` },
    { type: "COMMENT", title: "New comment", body: `${notificationSenders[1].displayName ?? notificationSenders[1].username} commented on your review.` },
    { type: "FOLLOW", title: "New follower", body: `${notificationSenders[2].displayName ?? notificationSenders[2].username} started following you.` },
    { type: "GUESS", title: "New guess", body: `${notificationSenders[3].displayName ?? notificationSenders[3].username} guessed on your review.` },
    { type: "CHALLENGE_RECEIVED", title: "Challenge received", body: `${notificationSenders[4].displayName ?? notificationSenders[4].username} challenged you to a head-to-head.` },
    { type: "CHALLENGE_BEAT", title: "You were beaten", body: `${notificationSenders[5].displayName ?? notificationSenders[5].username} beat your score.` },
  ];
  await Promise.all(
    notificationRows.map((n, i) =>
      prisma.notification.create({
        data: {
          userId: serge.id,
          type: n.type as any,
          title: n.title,
          body: n.body,
          createdAt: hoursAgo(i * 4 + 2),
        },
      })
    )
  );
  console.log("Created notifications for @serge");

  // 8. Demo review for a product with an affiliate URL so the "Shop" CTA is visible
  const affiliateProduct = products.find((p) => p.affiliateUrl && p.affiliateUrl.trim().length > 0) ?? pick(products);
  const affiliateReviewer = pick(users.filter((u) => u.id !== serge.id));
  const affiliateReview = await prisma.review.create({
    data: {
      userId: affiliateReviewer.id,
      productId: affiliateProduct.id,
      videoUrl: "/uploads/seed/seed-0.mp4",
      thumbnailUrl: null,
      duration: 5,
      format: "video/mp4",
      rating: randomRating(),
      caption: `Check out the ${affiliateProduct.name} — shop link below!`,
      productTag: affiliateProduct.category,
      status: "PUBLISHED",
    },
  });
  console.log(
    "Created demo affiliate review:",
    affiliateReview.id,
    "for product",
    affiliateProduct.name,
    "→",
    affiliateProduct.affiliateUrl ?? "(no affiliate URL set)"
  );

  // Refresh published reviews list so challenges can pick from the new review too
  publishedReviews.push({ ...affiliateReview, user: { id: affiliateReviewer.id } });

  // 9. Pending per-video challenges involving Serge
  const challengeReview1 = pick(publishedReviews);
  const challenger1 = pick(users.filter((u) => u.id !== serge.id));
  const challenger1Guess = await prisma.guess.create({
    data: { userId: challenger1.id, reviewId: challengeReview1.id, guessedRating: randomRating(), isCorrect: false, score: 8 },
  });
  const challenge1 = await prisma.challenge.create({
    data: {
      type: "PER_VIDEO",
      creatorId: challenger1.id,
      challengerId: challenger1.id,
      challengedId: serge.id,
      reviewId: challengeReview1.id,
      name: `Challenge on ${challengeReview1.productTag ?? "a review"}`,
      description: `I scored ${challenger1Guess.score}/10 — bet you can't beat me`,
      challengerScore: challenger1Guess.score,
      challengedScore: 0,
      challengerSubmittedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  const challengeReview2 = pick(publishedReviews.filter((r) => r.id !== challengeReview1.id));
  const challenged2 = pick(users.filter((u) => u.id !== serge.id));
  const sergeGuess = await prisma.guess.create({
    data: { userId: serge.id, reviewId: challengeReview2.id, guessedRating: randomRating(), isCorrect: false, score: 9 },
  });
  const challenge2 = await prisma.challenge.create({
    data: {
      type: "PER_VIDEO",
      creatorId: serge.id,
      challengerId: serge.id,
      challengedId: challenged2.id,
      reviewId: challengeReview2.id,
      name: `Challenge on ${challengeReview2.productTag ?? "a review"}`,
      description: `I scored ${sergeGuess.score}/10 — bet you can't beat me`,
      challengerScore: sergeGuess.score,
      challengedScore: 0,
      challengerSubmittedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  console.log("Created pending challenges:", challenge1.id, challenge2.id);

  // Update denormalized counters on Serge
  const stats = await prisma.user.update({
    where: { id: serge.id },
    data: {
      totalReviews: { set: sergeReviews.length },
      totalGuesses: { set: guessTargets.length },
      totalLikes: { set: likeTargets.length },
    },
  });

  console.log("Updated @serge stats:", {
    reviews: stats.totalReviews,
    guesses: stats.totalGuesses,
    likes: stats.totalLikes,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
