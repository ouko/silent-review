import type { AuthProvider, ProviderProfile } from "@silent-review/shared";
import { env } from "../../config/index.js";

export interface TikTokAuthPayload {
  code: string;
  redirectUri: string;
}

interface TikTokTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  open_id: string;
}

interface TikTokUserInfo {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url?: string;
      display_name?: string;
    };
  };
}

export class TikTokProvider implements AuthProvider {
  readonly id = "tiktok" as const;
  readonly label = "TikTok" as const;

  isAvailable(): boolean {
    return Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET);
  }

  async authenticate(payload: unknown): Promise<ProviderProfile> {
    if (!this.isAvailable()) {
      throw new Error("TikTok login is not configured");
    }

    const { code, redirectUri } = payload as TikTokAuthPayload;
    const tokens = await this.exchangeCode(code, redirectUri);
    const profile = await this.fetchUserInfo(tokens.access_token);

    return {
      providerId: profile.data.user.open_id,
      email: null,
      displayName: profile.data.user.display_name ?? null,
      avatarUrl: profile.data.user.avatar_url ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  }

  private async exchangeCode(code: string, redirectUri: string): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY!,
      client_secret: env.TIKTOK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TikTok token exchange failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<TikTokTokenResponse>;
  }

  private async fetchUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TikTok userinfo failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<TikTokUserInfo>;
  }
}
