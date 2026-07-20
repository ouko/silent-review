import { z } from "zod";

export const SubmitGuessSchema = z.object({
  guessedRating: z.number().int().min(1).max(10),
});

export type SubmitGuessInput = z.infer<typeof SubmitGuessSchema>;
