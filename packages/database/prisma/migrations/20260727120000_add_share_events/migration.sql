-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareEvent_reviewId_idx" ON "ShareEvent"("reviewId");

-- CreateIndex
CREATE INDEX "ShareEvent_userId_idx" ON "ShareEvent"("userId");

-- CreateIndex
CREATE INDEX "ShareEvent_createdAt_idx" ON "ShareEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ShareEvent_provider_createdAt_idx" ON "ShareEvent"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
