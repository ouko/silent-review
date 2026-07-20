import { prisma } from "../prisma.js";
import type { CreateProductInput, SearchProductsInput } from "./products.validation.js";

export async function searchProducts(input: SearchProductsInput) {
  const { q, category, limit = 20 } = input;

  if (!q?.trim()) {
    return prisma.product.findMany({
      where: {
        deletedAt: null,
        moderationStatus: { in: ["APPROVED", "PENDING"] },
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // PostgreSQL full-text search using tsvector. We build a query that ranks
  // matches on name, brand, category, and tags. This scales to millions of
  // products with a GIN index on searchVector.
  const searchTerm = q.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const tsQuery = searchTerm.split(/\s+/).filter(Boolean).join(" & ");

  const categoryClause = category ? `AND category = $4` : "";
  const params: (string | number)[] = [tsQuery, `%${searchTerm}%`, `%${searchTerm}%`, limit];
  if (category) params.splice(3, 0, category);

  const products = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT
      id,
      name,
      brand,
      category,
      description,
      "imageUrl",
      "affiliateUrl",
      tags,
      metadata,
      "searchVector",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "moderationStatus"
    FROM "Product"
    WHERE
      "deletedAt" IS NULL
      AND "moderationStatus" IN ('APPROVED', 'PENDING')
      ${categoryClause}
      AND (
        to_tsvector('english', COALESCE("searchVector", '')) @@ to_tsquery('english', $1)
        OR name ILIKE $2
        OR brand ILIKE $3
      )
    ORDER BY
      ts_rank(to_tsvector('english', COALESCE("searchVector", '')), to_tsquery('english', $1)) DESC,
      "createdAt" DESC
    LIMIT ${category ? "$5" : "$4"}
  `, ...params);

  return products;
}

export async function createProduct(input: CreateProductInput) {
  const { name, brand, category, description } = input;

  // Auto-approve seeded-like products; new user-added products go to pending queue.
  const moderationStatus = "PENDING";

  return prisma.product.create({
    data: {
      name,
      brand,
      category,
      description,
      tags: [category.toLowerCase(), brand?.toLowerCase()].filter(Boolean) as string[],
      searchVector: `${name} ${brand ?? ""} ${category}`.toLowerCase(),
      moderationStatus,
    },
  });
}

export async function approveProduct(productId: string) {
  return prisma.product.update({
    where: { id: productId },
    data: { moderationStatus: "APPROVED" },
  });
}

export async function rejectProduct(productId: string) {
  return prisma.product.update({
    where: { id: productId },
    data: { moderationStatus: "REJECTED" },
  });
}
