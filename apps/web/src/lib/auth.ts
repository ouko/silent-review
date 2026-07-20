import { api } from "./api";
import { useAuthStore, type User } from "../stores/authStore";

export type AuthProvider = "email" | "google" | "apple" | "tiktok" | "instagram";
export type OAuthProvider = Exclude<AuthProvider, "email">;

export interface AuthResponse {
  user: User;
  accessToken: string;
  isNewUser?: boolean;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
  setAuth(data);
  return data;
}

export async function register(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  setAuth(data);
  return data;
}

export async function oauthLogin(
  provider: Exclude<AuthProvider, "email">,
  payload: Record<string, unknown>
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>(`/api/auth/oauth/${provider}`, payload);
  setAuth(data);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/auth/logout");
  } finally {
    useAuthStore.getState().logout();
    window.location.href = "/login";
  }
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get("/api/auth/me");
  return data.user as User;
}

export async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<AuthResponse>("/api/auth/refresh", {});
  useAuthStore.getState().setAccessToken(data.accessToken);
  return data.accessToken;
}

export function setAuth(response: AuthResponse): void {
  useAuthStore.getState().setUser(response.user);
  useAuthStore.getState().setAccessToken(response.accessToken);
}
