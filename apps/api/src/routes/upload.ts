import { Router } from "express";
import { PresignedUploadSchema } from "@silent-review/shared";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { createPresignedUpload } from "../services/s3.js";

export const uploadRouter = Router();

uploadRouter.post("/presigned", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = PresignedUploadSchema.parse(req.body);
    const result = await createPresignedUpload(data.contentType, data.size);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
