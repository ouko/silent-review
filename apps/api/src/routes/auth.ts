import { Router } from "express";
import rateLimit from "express-rate-limit";
import { LoginSchema, RegisterSchema } from "@silent-review/shared";
import { prisma } from "../prisma.js";
import { env, REFRESH_COOKIE_NAME } from "../config/index.js";
import {
  requireAuth,
  signAccessToken,
  findUserById,
  type AuthenticatedRequest,
  type UserRole,
} from "../middleware/auth.js";
import {
  hashPassword,
  verifyPassword,
} from "../auth/providers/email.provider.js";
import {
  AuthService,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  toSafeUser,
} from "../auth/auth.service.js";
import {
  EmailProvider,
  GoogleProvider,
  AppleProvider,
  TikTokProvider,
  InstagramProvider,
} from "../auth/providers/index.js";
import { getEnabledProviders, isProviderEnabled } from "../services/features.js";

export const authRouter = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const authService = new AuthService();
authService.register(new EmailProvider());
authService.register(new GoogleProvider());
authService.register(new AppleProvider());
authService.register(new TikTokProvider());
authService.register(new InstagramProvider());

// Rate limit: 5 login attempts per IP per minute in production.
// Relaxed in development to avoid blocking local tests and rapid iteration.
const isDev = process.env.NODE_ENV !== "production";
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: "Too many login attempts. Please try again in a minute." },
});

async function issueTokens(
  res: import("express").Response,
  userId: string,
  email: string,
  role: import("../middleware/auth.js").UserRole
) {
  const accessToken = signAccessToken({ userId, email, role });
  const refreshToken = await createRefreshToken(userId);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  return { accessToken, refreshToken };
}

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               username: { type: string }
 *               password: { type: string }
 *               displayName: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email or username already taken
 */
authRouter.post("/register", loginLimiter, async (req, res, next) => {
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
    });

    const { accessToken } = await issueTokens(res, user.id, user.email, user.role as UserRole);
    res.status(201).json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const { accessToken } = await issueTokens(res, user.id, user.email, user.role as UserRole);
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
    const { accessToken } = await issueTokens(res, user.id, user.email, user.role as UserRole);
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

authRouter.get("/providers", async (_req, res) => {
  const availability: Record<string, boolean> = {
    google: new GoogleProvider().isAvailable(),
    apple: new AppleProvider().isAvailable(),
    tiktok: new TikTokProvider().isAvailable(),
    instagram: new InstagramProvider().isAvailable(),
  };
  const enabledIds = await getEnabledProviders(availability);
  const providers = authService
    .listAvailableProviders()
    .filter((p) => p.id === "email" || enabledIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.label }));
  res.json({ providers });
});

authRouter.post("/oauth/:provider", loginLimiter, async (req, res, next) => {
  try {
    const providerId = req.params.provider;
    if (!["google", "apple", "tiktok", "instagram"].includes(providerId)) {
      res.status(400).json({ error: "Unsupported provider" });
      return;
    }

    const provider = authService.getProvider(providerId as "google" | "apple" | "tiktok" | "instagram");
    if (!provider?.isAvailable()) {
      res.status(503).json({ error: "Provider not available" });
      return;
    }
    const enabled = await isProviderEnabled(providerId, provider.isAvailable());
    if (!enabled) {
      res.status(503).json({ error: "Provider disabled by feature flag" });
      return;
    }

    const result = await authService.authenticate(providerId as "google" | "apple" | "tiktok" | "instagram", req.body);
    const { accessToken } = await issueTokens(res, result.user.id, result.user.email, result.user.role as UserRole);
    res.json({ user: result.user, accessToken, isNewUser: result.isNewUser });
  } catch (err) {
    next(err);
  }
});

// Legacy redirect endpoints for OAuth flows that need a server-side redirect.
authRouter.get("/google", (_req, res) => {
  res.status(501).json({ error: "Use POST /api/auth/oauth/google with the authorization code" });
});

authRouter.get("/apple", (_req, res) => {
  res.status(501).json({ error: "Use POST /api/auth/oauth/apple with the authorization code" });
});
