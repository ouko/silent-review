import { create } from "zustand";
import { generateUUID } from "../lib/uuid";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  toasts: Toast[];
  isLoading: boolean;
  activeModal: string | null;
  showBottomNav: boolean;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setShowBottomNav: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isLoading: false,
  activeModal: null,
  showBottomNav: true,
  addToast: (message, type = "info") =>
    set((state) => ({
      toasts: [...state.toasts, { id: generateUUID(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
  setShowBottomNav: (showBottomNav) => set({ showBottomNav }),
}));
