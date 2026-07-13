import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  const message = (err as Error).message ?? "Internal server error";

  console.error(err);
  res.status(status).json({ error: message });
};
