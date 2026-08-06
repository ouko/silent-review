-- Speed up feed, profile, and activity queries.
CREATE INDEX IF NOT EXISTS "Review_status_deletedAt_createdAt_idx" ON "Review" ("status", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_status_deletedAt_guessCount_createdAt_idx" ON "Review" ("status", "deletedAt", "guessCount" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Review_userId_deletedAt_createdAt_idx" ON "Review" ("userId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_userId_createdAt_idx" ON "Review" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Guess_userId_createdAt_idx" ON "Guess" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Like_userId_createdAt_idx" ON "Like" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt");
