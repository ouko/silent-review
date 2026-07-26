import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, accessToken: null }),
}));
