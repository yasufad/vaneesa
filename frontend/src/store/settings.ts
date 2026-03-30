import { create } from "zustand";

import { Settings, DetectorThresholds } from "../../bindings/github.com/yasufad/vaneesa/internal/db/models";

interface SettingsState {
  settings: Settings;
  thresholds: DetectorThresholds;
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;

  // Actions
  loadAll: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  updateThresholds: (patch: Partial<DetectorThresholds>) => void;
  saveSettings: () => Promise<void>;
  saveThresholds: () => Promise<void>;
}

const DEFAULT_SETTINGS = new Settings();
const DEFAULT_THRESHOLDS = new DetectorThresholds({
  rateSpikeMultiplier: 5,
  rateSpikeMinimumPPS: 10,
  portScanThreshold: 20,
  synFloodRatio: 10,
  synFloodMinimumSYNs: 50,
});

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  thresholds: { ...DEFAULT_THRESHOLDS },
  isLoading: false,
  isDirty: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      // Bindings are imported dynamically to decouple the frontend build from
      // the backend's generation state. The catch block ensures initialisation
      // continues with stable defaults if the backend is unavailable.
      const SettingsService =
        await import("../../bindings/github.com/yasufad/vaneesa/settingsservice");
      const [settingsResp, thresholdsResp] = await Promise.all([
        SettingsService.GetSettings(),
        SettingsService.GetDetectorThresholds(),
      ]);
      set({
        settings: settingsResp || DEFAULT_SETTINGS,
        thresholds: thresholdsResp || DEFAULT_THRESHOLDS,
        isLoading: false,
      });
    } catch {
      // Backend not yet connected or bindings not generated - use defaults silently.
      set({ isLoading: false });
    }
  },

  updateSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch },
      isDirty: true,
    })),

  updateThresholds: (patch) =>
    set((state) => ({
      thresholds: { ...state.thresholds, ...patch },
      isDirty: true,
    })),

  saveSettings: async () => {
    set({ error: null });
    try {
      const SettingsService =
        await import("../../bindings/github.com/yasufad/vaneesa/settingsservice");
      await SettingsService.SaveSettings(get().settings);
      set({ isDirty: false });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  saveThresholds: async () => {
    set({ error: null });
    try {
      const SettingsService =
        await import("../../bindings/github.com/yasufad/vaneesa/settingsservice");
      await SettingsService.SaveDetectorThresholds(get().thresholds);
      set({ isDirty: false });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
