-- Align Product.ownerId foreign key with schema (ON UPDATE CASCADE).
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_ownerId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
