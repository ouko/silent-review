import type { AuthProvider, ProviderProfile } from "@silent-review/shared";
import { env } from "../../config/index.js";

export interface GoogleAuthPayload {
  code: string;
  redirectUri: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export class GoogleProvider implements AuthProvider {
  readonly id = "google" as const;
  readonly label = "Google" as const;

  isAvailable(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }

  async authenticate(payload: unknown): Promise<ProviderProfile> {
    if (!this.isAvailable()) {
      throw new Error("Google OAuth is not configured");
    }

    const { code, redirectUri } = payload as GoogleAuthPayload;
    const tokens = await this.exchangeCode(code, redirectUri);
    const profile = await this.fetchUserInfo(tokens.access_token);

    return {
      providerId: profile.sub,
      email: profile.email ?? null,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  }

  private async exchangeCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google token exchange failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<GoogleTokenResponse>;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google userinfo failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<GoogleUserInfo>;
  }
}
