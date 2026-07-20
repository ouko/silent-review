import type { AuthProvider, ProviderProfile } from "@silent-review/shared";
import { env } from "../../config/index.js";

export interface InstagramAuthPayload {
  code: string;
  redirectUri: string;
}

interface InstagramTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface InstagramUserInfo {
  id: string;
  username: string;
  account_type?: string;
}

export class InstagramProvider implements AuthProvider {
  readonly id = "instagram" as const;
  readonly label = "Instagram" as const;

  isAvailable(): boolean {
    return Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET);
  }

  async authenticate(payload: unknown): Promise<ProviderProfile> {
    if (!this.isAvailable()) {
      throw new Error("Instagram login is not configured");
    }

    const { code, redirectUri } = payload as InstagramAuthPayload;
    const tokens = await this.exchangeCode(code, redirectUri);
    const profile = await this.fetchUserInfo(tokens.access_token);

    return {
      providerId: profile.id,
      email: null,
      displayName: profile.username,
      avatarUrl: null,
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  }

  private async exchangeCode(code: string, redirectUri: string): Promise<InstagramTokenResponse> {
    const params = new URLSearchParams({
      client_id: env.INSTAGRAM_APP_ID!,
      client_secret: env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const res = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Instagram token exchange failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<InstagramTokenResponse>;
  }

  private async fetchUserInfo(accessToken: string): Promise<InstagramUserInfo> {
    const res = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Instagram userinfo failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<InstagramUserInfo>;
  }
}
