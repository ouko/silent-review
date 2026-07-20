/**
 * Provider-agnostic authentication abstractions.
 *
 * The API treats every identity provider equally. New providers can be added
 * by implementing the AuthProvider interface; the auth service orchestrates
 * them without knowing provider-specific details.
 */

export type AuthProviderId = "email" | "google" | "apple" | "tiktok" | "instagram";

export interface ProviderProfile {
  /** Provider-scoped unique identifier for the account */
  providerId: string;
  /** Best-effort email from the provider (may be missing or proxy) */
  email: string | null;
  /** Display-friendly name */
  displayName: string | null;
  /** Public avatar URL */
  avatarUrl: string | null;
  /** Raw access token from the provider, if available */
  accessToken?: string;
  /** Raw refresh token from the provider, if available */
  refreshToken?: string;
  /** Provider token expiry, if known */
  expiresAt?: Date;
}

export interface AuthProvider {
  readonly id: AuthProviderId;
  /** Human-readable label shown on auth buttons */
  readonly label: string;
  /** Whether the provider is configured and available for use */
  isAvailable(): boolean;
  /** Initiate the provider's login flow and return the resulting profile */
  authenticate(payload: unknown): Promise<ProviderProfile>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: import("../types.js").SafeUser;
  accessToken: string;
}
