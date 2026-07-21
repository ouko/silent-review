import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const notificationsRouter = Router();

const MAX_ACTIVITY_ITEMS = 50;
const PRUNE_DAYS = 30;

notificationsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: MAX_ACTIVITY_ITEMS,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    // Auto-prune notifications older than 30 days asynchronously
    const pruneBefore = new Date(Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000);
    prisma.notification
      .deleteMany({ where: { userId, createdAt: { lt: pruneBefore } } })
      .catch(() => {});

    res.json({
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      })),
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/:id/read", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { readAt: new Date() },
    });
    res.json({ read: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/read-all", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ read: true });
  } catch (err) {
    next(err);
  }
});
