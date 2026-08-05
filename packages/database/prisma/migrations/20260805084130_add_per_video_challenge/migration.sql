-- CreateEnum (idempotent: safe if a previous `prisma db push` already added the type)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChallengeType') THEN
    CREATE TYPE "ChallengeType" AS ENUM ('GENERIC', 'PER_VIDEO');
  END IF;
END $$;

-- AlterEnum (idempotent)
DO $$
DECLARE
  notification_type_oid oid;
BEGIN
  notification_type_oid := to_regtype('"NotificationType"');
  IF notification_type_oid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = notification_type_oid AND enumlabel = 'CHALLENGE_RECEIVED') THEN
      ALTER TYPE "NotificationType" ADD VALUE 'CHALLENGE_RECEIVED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = notification_type_oid AND enumlabel = 'CHALLENGE_BEAT') THEN
      ALTER TYPE "NotificationType" ADD VALUE 'CHALLENGE_BEAT';
    END IF;
  END IF;
END $$;

-- AlterTable (idempotent)
ALTER TABLE "Challenge"
  ADD COLUMN IF NOT EXISTS "challengedId" TEXT,
  ADD COLUMN IF NOT EXISTS "challengedScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "challengerId" TEXT,
  ADD COLUMN IF NOT EXISTS "challengerScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rematchOfId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewId" TEXT,
  ADD COLUMN IF NOT EXISTS "type" "ChallengeType" NOT NULL DEFAULT 'GENERIC';

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Challenge_challengerId_idx" ON "Challenge"("challengerId");
CREATE INDEX IF NOT EXISTS "Challenge_challengedId_idx" ON "Challenge"("challengedId");
CREATE INDEX IF NOT EXISTS "Challenge_reviewId_idx" ON "Challenge"("reviewId");
CREATE UNIQUE INDEX IF NOT EXISTS "Challenge_challengerId_challengedId_reviewId_status_key" ON "Challenge"("challengerId", "challengedId", "reviewId", "status");

-- AddForeignKey (idempotent)
DO $$
DECLARE
  challenge_class oid;
BEGIN
  challenge_class := to_regclass('"Challenge"');
  IF challenge_class IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Challenge_reviewId_fkey' AND conrelid = challenge_class) THEN
      ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Challenge_challengerId_fkey' AND conrelid = challenge_class) THEN
      ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Challenge_challengedId_fkey' AND conrelid = challenge_class) THEN
      ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Challenge_rematchOfId_fkey' AND conrelid = challenge_class) THEN
      ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_rematchOfId_fkey" FOREIGN KEY ("rematchOfId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
