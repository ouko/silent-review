-- AddLikeCount-like denormalized counter for video completion (watched >=90%).
ALTER TABLE "Review" ADD COLUMN "completeCount" INTEGER NOT NULL DEFAULT 0;
