import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { createInvite, deleteInvite, getInviteByCode, getInvitesForUser, trackInviteClick } from "./invites.service.js";

export const invitesRouter = Router();

invitesRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const invite = await createInvite(req.user!.id);
    const link = `${process.env.WEB_APP_URL}/invite/${invite.code}`;
    res.status(201).json({ invite: { ...invite, link } });
  } catch (err) {
    next(err);
  }
});

invitesRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;
    const cursor = typeof req.query.cursor === "string" && req.query.cursor ? req.query.cursor : undefined;
    const { invites, nextCursor } = await getInvitesForUser(req.user!.id, { cursor, limit });
    const baseUrl = process.env.WEB_APP_URL || `${req.protocol}://${req.get("host")}`;
    res.json({
      invites: invites.map((invite) => ({
        ...invite,
        link: `${baseUrl}/invite/${invite.code}`,
      })),
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
});

invitesRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = await deleteInvite(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

invitesRouter.get("/:code", async (req, res, next) => {
  try {
    await trackInviteClick(req.params.code);
    const invite = await getInviteByCode(req.params.code);
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    res.json({ invite });
  } catch (err) {
    next(err);
  }
});
