import { prisma } from "../prisma.js";
import { env } from "../config/index.js";
import { runVideoModeration } from "./moderationEngine.js";
import { Prisma } from "@silent-review/database";

interface QueueItem {
  videoPath: string;
  duration: number;
  reviewId?: string;
}

const queue: QueueItem[] = [];
let processing = false;

export function enqueueModeration(videoPath: string, duration: number, reviewId?: string): void {
  if (env.VIDEO_MODERATION_ENABLED !== "true") return;
  queue.push({ videoPath, duration, reviewId });
  void processQueue();
}

export async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      await runModeration(item);
    }
  } finally {
    processing = false;
  }
}

async function runModeration(item: QueueItem): Promise<void> {
  try {
    const result = await runVideoModeration(item.videoPath, item.duration);

    if (item.reviewId) {
      await prisma.videoModeration.upsert({
        where: { reviewId: item.reviewId },
        update: {
          status: result.status,
          score: result.score,
          reasons: result.reasons,
          frameScores: result.frameScores as unknown as Prisma.InputJsonValue,
        },
        create: {
          reviewId: item.reviewId,
          status: result.status,
          score: result.score,
          reasons: result.reasons,
          frameScores: result.frameScores as unknown as Prisma.InputJsonValue,
        },
      });

      if (result.status === "REJECT") {
        await prisma.review.update({
          where: { id: item.reviewId },
          data: { status: "HIDDEN" },
        });
      }
    }
  } catch (err) {
    const failClosed = env.VIDEO_MODERATION_FAIL_CLOSED === "true";
    if (item.reviewId && failClosed) {
      try {
        await prisma.videoModeration.upsert({
          where: { reviewId: item.reviewId },
          update: {
            status: "REJECT",
            reasons: ["Moderation could not be completed"],
          },
          create: {
            reviewId: item.reviewId,
            status: "REJECT",
            reasons: ["Moderation could not be completed"],
          },
        });
        await prisma.review.update({
          where: { id: item.reviewId },
          data: { status: "HIDDEN" },
        });
      } catch (dbErr) {
        console.error("Failed to persist fail-closed moderation state", dbErr);
      }
    }
    console.error("Moderation failed", err);
  }
}

// Test-only helpers are only exported in test environments so they cannot be
// imported or relied upon in production code.
export const __testOnlyResetQueue =
  process.env.NODE_ENV === "test"
    ? (): void => {
        queue.length = 0;
        processing = false;
      }
    : undefined;

export const __testOnlyPushQueue =
  process.env.NODE_ENV === "test"
    ? (item: QueueItem): void => {
        queue.push(item);
      }
    : undefined;
