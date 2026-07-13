import { Router } from "express";
import {
  LoginSchema,
  RegisterSchema,
} from "@silent-review/shared";
import { prisma } from "../prisma.js";
import { env, REFRESH_COOKIE_NAME } from "../config/index.js";
import {
  requireAuth,
  signAccessToken,
  findUserById,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import {
  hashPassword,
  verifyPassword,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  toSafeUser,
} from "../services/auth.js";

export const authRouter = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

async function issueTokens(res: import("express").Response, userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = await createRefreshToken(userId);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  return { accessToken, refreshToken };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      res.status(409).json({ error: "Email or username already taken" });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
      },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    const { accessToken } = await issueTokens(res, user.id, user.email);
    res.status(201).json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const { accessToken } = await issueTokens(res, user.id, user.email);
    res.json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (!token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    const userId = await verifyRefreshToken(token);
    if (!userId) {
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    await revokeRefreshToken(token);
    const user = await findUserById(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const { accessToken } = await issueTokens(res, user.id, user.email);
    res.json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (token) await revokeRefreshToken(token);
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/google", (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(501).json({ error: "Google OAuth not configured" });
    return;
  }
  res.status(501).json({ error: "Google OAuth strategy wired in next phase" });
});

authRouter.get("/google/callback", (_req, res) => {
  res.redirect(`${env.WEB_APP_URL}/login?error=google_not_implemented`);
});

authRouter.get("/apple", (_req, res) => {
  if (!env.APPLE_CLIENT_ID) {
    res.status(501).json({ error: "Apple OAuth not configured" });
    return;
  }
  res.status(501).json({ error: "Apple OAuth strategy wired in next phase" });
});

authRouter.post("/apple/callback", (_req, res) => {
  res.redirect(`${env.WEB_APP_URL}/login?error=apple_not_implemented`);
});
