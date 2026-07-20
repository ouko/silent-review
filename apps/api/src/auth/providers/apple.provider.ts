import jwt from "jsonwebtoken";
import type { AuthProvider, ProviderProfile } from "@silent-review/shared";
import { env } from "../../config/index.js";

export interface AppleAuthPayload {
  code: string;
  idToken?: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

interface AppleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token: string;
}

interface AppleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
}

export class AppleProvider implements AuthProvider {
  readonly id = "apple" as const;
  readonly label = "Apple" as const;

  isAvailable(): boolean {
    return Boolean(
      env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY
    );
  }

  async authenticate(payload: unknown): Promise<ProviderProfile> {
    if (!this.isAvailable()) {
      throw new Error("Sign in with Apple is not configured");
    }

    const { code, idToken, user } = payload as AppleAuthPayload;

    // Server-side flow: exchange code for tokens.
    const tokens = await this.exchangeCode(code);
    const rawIdToken = idToken ?? tokens.id_token;
    const claims = jwt.decode(rawIdToken) as AppleIdTokenPayload | null;
    if (!claims?.sub) {
      throw new Error("Apple ID token is missing subject claim");
    }

    const displayName = user?.name
      ? [user.name.firstName, user.name.lastName].filter(Boolean).join(" ") || null
      : null;

    return {
      providerId: claims.sub,
      email: claims.email ?? user?.email ?? null,
      displayName,
      avatarUrl: null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  }

  private async exchangeCode(code: string): Promise<AppleTokenResponse> {
    const clientSecret = jwt.sign(
      {
        iss: env.APPLE_TEAM_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 180,
        aud: "https://appleid.apple.com",
        sub: env.APPLE_CLIENT_ID,
      },
      env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      { algorithm: "ES256", keyid: env.APPLE_KEY_ID }
    );

    const params = new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    });

    const res = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Apple token exchange failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<AppleTokenResponse>;
  }
}
