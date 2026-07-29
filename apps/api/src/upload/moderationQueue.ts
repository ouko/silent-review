import { prisma } from "../prisma.js";
import { env } from "../config/index.js";
import { runVideoModeration } from "./moderationEngine.js";
import type { ModerationResult } from "./moderationEngine.js";

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

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    await runModeration(item);
  }

  processing = false;
}

/** Test-only helper to reset internal queue state between tests. */
export function __testOnlyResetQueue(): void {
  queue.length = 0;
  processing = false;
}

/** Test-only helper to push an item without triggering processing. */
export function __testOnlyPushQueue(item: QueueItem): void {
  queue.push(item);
}

async function runModeration(item: QueueItem): Promise<void> {
  try {
    const result: ModerationResult = await runVideoModeration(item.videoPath, item.duration);

    if (item.reviewId) {
      await prisma.videoModeration.create({
        data: {
          reviewId: item.reviewId,
          status: result.status,
          score: result.score,
          reasons: result.reasons,
          frameScores: result.frameScores as any,
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
      await prisma.videoModeration.create({
        data: {
          reviewId: item.reviewId,
          status: "REJECT",
          reasons: ["Moderation could not be completed"],
        },
      });
      await prisma.review.update({
        where: { id: item.reviewId },
        data: { status: "HIDDEN" },
      });
    }
    console.error("Moderation failed", err);
  }
}
