-- Merchants: new role value + product ownership.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MERCHANT';

ALTER TABLE "Product" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");
