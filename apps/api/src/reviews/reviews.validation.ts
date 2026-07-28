import { z } from "zod";

export const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1).optional().nullable(),
  duration: z.number().min(4.5).max(5.5),
  format: z.string().regex(/^video\//),
  rating: z.number().int().min(1).max(10),
  caption: z.string().max(280).optional(),
  productTag: z.string().max(50).optional().nullable(),
  duetOfId: z.string().uuid().optional().nullable(),
});

export const SubmitGuessSchema = z.object({
  guessedRating: z.number().int().min(1).max(10),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type SubmitGuessInput = z.infer<typeof SubmitGuessSchema>;
