import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { createInvite, getInviteByCode, getInvitesForUser, trackInviteClick } from "./invites.service.js";

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
    const invites = await getInvitesForUser(req.user!.id);
    res.json({ invites });
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
