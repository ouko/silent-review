-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'PASS', 'REVIEW', 'REJECT');

-- CreateTable
CREATE TABLE "VideoModeration" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "reasons" TEXT[],
    "frameScores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoModeration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoModeration_reviewId_key" ON "VideoModeration"("reviewId");

-- CreateIndex
CREATE INDEX "VideoModeration_status_updatedAt_idx" ON "VideoModeration"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "VideoModeration" ADD CONSTRAINT "VideoModeration_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
