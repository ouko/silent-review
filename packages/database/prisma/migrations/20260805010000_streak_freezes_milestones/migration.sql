-- Add streak freeze counters and at-risk notification type.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STREAK_AT_RISK';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "freezeHeld" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastFreezeEarnedAt" TIMESTAMP(3);
