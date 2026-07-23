import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { exportUserData } from "./export.service.js";

export const exportRouter = Router();

exportRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await exportUserData(req.user!.id);
    res.setHeader("Content-Disposition", "attachment; filename=silent-review-export.json");
    res.setHeader("Content-Type", "application/json");
    res.json(data);
  } catch (err) {
    next(err);
  }
});
