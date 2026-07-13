import { create } from "zustand";

export const useAuthStore = create(() => ({
  user: null,
  isLoading: false,
}));
