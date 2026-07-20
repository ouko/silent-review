import crypto from "crypto";
import type { AuthProvider, AuthProviderId, ProviderProfile, SafeUser } from "@silent-review/shared";
import type { User } from "@silent-review/database";
import { prisma } from "../prisma.js";
import { REFRESH_TOKEN_TTL_DAYS } from "../config/index.js";

export interface AuthResult {
  user: SafeUser;
  isNewUser: boolean;
  providerAccountId: string;
}

export class AuthService {
  private providers = new Map<AuthProviderId, AuthProvider>();

  register(provider: AuthProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: AuthProviderId): AuthProvider | undefined {
    return this.providers.get(id);
  }

  listAvailableProviders(): AuthProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isAvailable());
  }

  /**
   * Authenticate with a provider and link the resulting profile to a local user.
   * If the provider account is already linked, return the existing user.
   * If the email matches an existing user (and the provider supplies a verified
   * email), link the new provider account to that user.
   * Otherwise, create a new user.
   */
  async authenticate(
    providerId: AuthProviderId,
    payload: unknown
  ): Promise<AuthResult> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    if (!provider.isAvailable()) {
      throw new Error(`Provider ${providerId} is not available`);
    }

    const profile = await provider.authenticate(payload);

    // 1. Existing OAuth link?
    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: providerId, providerId: profile.providerId } },
      include: { user: true },
    });

    if (existingAccount) {
      await this.updateOAuthTokens(existingAccount.id, profile);
      return {
        user: toSafeUser(existingAccount.user),
        isNewUser: false,
        providerAccountId: existingAccount.id,
      };
    }

    // 2. Try to link by verified email.
    let user: User | null = null;
    if (profile.email) {
      user = await prisma.user.findUnique({ where: { email: profile.email } });
    }

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: profile.email ?? `${providerId}_${profile.providerId}@silentreview.local`,
          username: await generateUsername(profile.displayName, profile.providerId),
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          emailVerified: profile.email ? true : false,
        },
      });
    }

    await prisma.oAuthAccount.create({
      data: {
        provider: providerId,
        providerId: profile.providerId,
        userId: user.id,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        expiresAt: profile.expiresAt,
      },
    });

    return {
      user: toSafeUser(user),
      isNewUser,
      providerAccountId: profile.providerId,
    };
  }

  private async updateOAuthTokens(accountId: string, profile: ProviderProfile): Promise<void> {
    if (!profile.accessToken && !profile.refreshToken && !profile.expiresAt) return;
    await prisma.oAuthAccount.update({
      where: { id: accountId },
      data: {
        accessToken: profile.accessToken ?? undefined,
        refreshToken: profile.refreshToken ?? undefined,
        expiresAt: profile.expiresAt ?? undefined,
      },
    });
  }
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
  role: string;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

async function generateUsername(
  displayName: string | null,
  providerId: string
): Promise<string> {
  const base = displayName
    ? displayName.toLowerCase().replace(/[^a-z0-9]/g, "")
    : `user${providerId.slice(0, 8)}`;

  let username = base;
  let attempt = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${attempt}`;
    attempt++;
  }
  return username;
}
