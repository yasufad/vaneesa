import { create } from "zustand";

export type ViewType =
  | "dashboard"
  | "connections"
  | "hosts"
  | "protocols"
  | "alerts"
  | "sessions"
  | "settings";

interface NavigationState {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),
}));
