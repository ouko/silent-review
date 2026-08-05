-- Add DAILY_DROP to NotificationType (idempotent)
DO $$
DECLARE
  notification_type_oid oid;
BEGIN
  notification_type_oid := to_regtype('"NotificationType"');
  IF notification_type_oid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = notification_type_oid AND enumlabel = 'DAILY_DROP') THEN
      ALTER TYPE "NotificationType" ADD VALUE 'DAILY_DROP';
    END IF;
  END IF;
END $$;

-- Create CurationStatus enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CurationStatus') THEN
    CREATE TYPE "CurationStatus" AS ENUM ('CANDIDATE', 'APPROVED', 'REJECTED', 'SCHEDULED');
  END IF;
END $$;

-- Create ContentCuration table (idempotent)
CREATE TABLE IF NOT EXISTS "ContentCuration" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "guessabilityScore" DOUBLE PRECISION NOT NULL,
  "status" "CurationStatus" NOT NULL DEFAULT 'CANDIDATE',
  "scheduledDate" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentCuration_pkey" PRIMARY KEY ("id")
);

-- Create UserNotificationPreference table (idempotent)
CREATE TABLE IF NOT EXISTS "UserNotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dailyLive" BOOLEAN NOT NULL DEFAULT true,
  "streakAtRisk" BOOLEAN NOT NULL DEFAULT true,
  "challengeReceived" BOOLEAN NOT NULL DEFAULT true,
  "scoreBeaten" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Unique constraints (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "ContentCuration_status_guessabilityScore_idx" ON "ContentCuration"("status", "guessabilityScore");
CREATE INDEX IF NOT EXISTS "ContentCuration_scheduledDate_idx" ON "ContentCuration"("scheduledDate");
CREATE INDEX IF NOT EXISTS "ContentCuration_reviewId_idx" ON "ContentCuration"("reviewId");
CREATE INDEX IF NOT EXISTS "UserNotificationPreference_userId_idx" ON "UserNotificationPreference"("userId");

-- Foreign keys (idempotent)
DO $$
DECLARE
  content_curation_class oid;
  user_notification_pref_class oid;
BEGIN
  content_curation_class := to_regclass('"ContentCuration"');
  IF content_curation_class IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentCuration_reviewId_fkey' AND conrelid = content_curation_class) THEN
      ALTER TABLE "ContentCuration" ADD CONSTRAINT "ContentCuration_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  user_notification_pref_class := to_regclass('"UserNotificationPreference"');
  IF user_notification_pref_class IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserNotificationPreference_userId_fkey' AND conrelid = user_notification_pref_class) THEN
      ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
