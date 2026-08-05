import {
  curateNextCandidates,
  listContentQueue,
} from "../src/content-curation/contentCuration.service.js";
import { scheduleDailyDrops } from "../src/dailydrop/dailydrop.service.js";
import { prisma } from "../src/prisma.js";

const MIN_CANDIDATES = 250;
const DAYS_AHEAD = 90;

async function main() {
  // 1. Ensure a large pool of curated candidates is available.
  const existing = await prisma.contentCuration.count({
    where: { status: { in: ["CANDIDATE", "APPROVED", "SCHEDULED"] } },
  });

  const needed = Math.max(0, MIN_CANDIDATES - existing);
  let created = 0;
  if (needed > 0) {
    const result = await curateNextCandidates(needed + 50);
    created = result.created;
    console.log(`Curated ${created} new candidate reviews.`);
  } else {
    console.log(`Already have ${existing} curated reviews. No new candidates needed.`);
  }

  // 2. Auto-approve top candidates up to 90 days so the queue is actionable.
  const top = await listContentQueue({ status: "CANDIDATE", limit: DAYS_AHEAD });
  if (top.curations.length > 0) {
    const ids = top.curations.map((c) => c.id);
    await prisma.contentCuration.updateMany({
      where: { id: { in: ids } },
      data: { status: "APPROVED" },
    });
    console.log(`Auto-approved ${ids.length} top candidates for scheduling.`);
  }

  // 3. Fill the Daily Drop calendar 90 days ahead.
  const scheduled = await scheduleDailyDrops(DAYS_AHEAD);
  console.log(`Scheduled ${scheduled.scheduled} Daily Drops for the next ${DAYS_AHEAD} days.`);

  const summary = await prisma.contentCuration.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  console.log("\nCuration status summary:");
  for (const row of summary) {
    console.log(`  ${row.status}: ${row._count.status}`);
  }

  const futureDrops = await prisma.dailyDrop.count({
    where: { date: { gte: new Date() } },
  });
  console.log(`\nTotal future Daily Drops: ${futureDrops}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Curation failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
