-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('GENERIC', 'PER_VIDEO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CHALLENGE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'CHALLENGE_BEAT';

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "challengedId" TEXT,
ADD COLUMN     "challengedScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "challengerId" TEXT,
ADD COLUMN     "challengerScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rematchOfId" TEXT,
ADD COLUMN     "reviewId" TEXT,
ADD COLUMN     "type" "ChallengeType" NOT NULL DEFAULT 'GENERIC';

-- CreateIndex
CREATE INDEX "Challenge_challengerId_idx" ON "Challenge"("challengerId");

-- CreateIndex
CREATE INDEX "Challenge_challengedId_idx" ON "Challenge"("challengedId");

-- CreateIndex
CREATE INDEX "Challenge_reviewId_idx" ON "Challenge"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_challengerId_challengedId_reviewId_status_key" ON "Challenge"("challengerId", "challengedId", "reviewId", "status");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_rematchOfId_fkey" FOREIGN KEY ("rematchOfId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

