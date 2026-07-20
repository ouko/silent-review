import { api } from "./api";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  accessToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
  localStorage.setItem("accessToken", data.accessToken);
  return data;
}

export async function register(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  localStorage.setItem("accessToken", data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
  localStorage.removeItem("accessToken");
}

export async function fetchMe() {
  const { data } = await api.get("/api/auth/me");
  return data.user as AuthResponse["user"];
}
