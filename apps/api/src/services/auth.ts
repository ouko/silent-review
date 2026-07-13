import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { REFRESH_TOKEN_TTL_DAYS } from "../config/index.js";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return token;
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.expiresAt < new Date()) return null;
  return record.userId;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export function toSafeUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}
