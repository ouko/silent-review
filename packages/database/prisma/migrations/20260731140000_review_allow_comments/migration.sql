-- Creators can turn comments off per review.
ALTER TABLE "Review" ADD COLUMN "allowComments" BOOLEAN NOT NULL DEFAULT true;
