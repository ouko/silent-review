import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env, ACCESS_TOKEN_TTL_SECONDS } from "../config/index.js";
import { prisma } from "../prisma.js";

export type UserRole = "USER" | "CREATOR" | "MODERATOR" | "ADMIN";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: UserRole };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      role: UserRole;
    };
    req.user = { id: payload.userId, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        email: string;
        role: UserRole;
      };
      req.user = { id: payload.userId, email: payload.email, role: payload.role };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function signAccessToken(payload: { userId: string; email: string; role: UserRole }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });
}
