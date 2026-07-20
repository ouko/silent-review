import { z } from "zod";

export const SearchProductsSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).optional(),
  category: z.string().min(1).max(50),
  description: z.string().max(1000).optional(),
});

export type SearchProductsInput = z.infer<typeof SearchProductsSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
