-- CreateEnum
CREATE TYPE "ProductModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "moderationStatus" "ProductModerationStatus" NOT NULL DEFAULT 'APPROVED';
