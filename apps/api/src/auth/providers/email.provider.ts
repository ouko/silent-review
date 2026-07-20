import bcrypt from "bcryptjs";
import type { AuthProvider, ProviderProfile } from "@silent-review/shared";
import { prisma } from "../../prisma.js";

const SALT_ROUNDS = 12;

export interface EmailCredentials {
  email: string;
  password: string;
}

export class EmailProvider implements AuthProvider {
  readonly id = "email" as const;
  readonly label = "Email" as const;

  isAvailable(): boolean {
    return true;
  }

  async authenticate(payload: unknown): Promise<ProviderProfile> {
    const { email, password } = payload as EmailCredentials;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    return {
      providerId: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
