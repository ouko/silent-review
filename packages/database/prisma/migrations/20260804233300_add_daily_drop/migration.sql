-- CreateTable
CREATE TABLE "DailyDrop" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reviewId" TEXT NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDrop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyDrop_date_key" ON "DailyDrop"("date");

-- CreateIndex
CREATE INDEX "DailyDrop_reviewId_idx" ON "DailyDrop"("reviewId");

-- AlterTable
ALTER TABLE "Guess" ADD COLUMN "dailyDropId" TEXT;

-- CreateIndex
CREATE INDEX "Guess_dailyDropId_idx" ON "Guess"("dailyDropId");

-- CreateIndex
CREATE UNIQUE INDEX "Guess_userId_dailyDropId_key" ON "Guess"("userId", "dailyDropId");

-- AddForeignKey
ALTER TABLE "DailyDrop" ADD CONSTRAINT "DailyDrop_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_dailyDropId_fkey" FOREIGN KEY ("dailyDropId") REFERENCES "DailyDrop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
