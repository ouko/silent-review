import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

export const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().min(4.5).max(5.5),
  format: z.string().regex(/^video\//),
  rating: z.number().int().min(1).max(10),
  caption: z.string().max(280).optional(),
  productTag: z.string().max(50).optional(),
  duetOfId: z.string().uuid().optional(),
});

export const SubmitGuessSchema = z.object({
  guessedRating: z.number().int().min(1).max(10),
});

export const PresignedUploadSchema = z.object({
  contentType: z.string().regex(/^video\//),
  size: z.number().int().max(50 * 1024 * 1024),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type SubmitGuessInput = z.infer<typeof SubmitGuessSchema>;
export type PresignedUploadInput = z.infer<typeof PresignedUploadSchema>;
