import { create } from "zustand";
import {
  CaptureStatus,
  CaptureState,
  InterfaceInfo,
} from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";
import * as CaptureService from "../../bindings/github.com/yasufad/vaneesa/captureservice";

interface CaptureStore {
  status: CaptureStatus;
  interfaces: InterfaceInfo[];
  isLoadingInterfaces: boolean;

  // Actions
  loadInterfaces: () => Promise<void>;
  startCapture: (
    sessionName: string,
    iface: string,
    filter: string,
    promiscuous: boolean,
  ) => Promise<void>;
  stopCapture: () => Promise<void>;
  updateStatus: (status: CaptureStatus) => void;
}

const DEFAULT_STATUS: CaptureStatus = new CaptureStatus({
  State: CaptureState.StateIdle,
  Mode: "live",
  Interface: "",
  SessionID: 0,
  SessionName: "",
  OverflowDrops: 0,
  ErrorMessage: "",
});

export const useCaptureStore = create<CaptureStore>((set) => ({
  status: DEFAULT_STATUS,
  interfaces: [],
  isLoadingInterfaces: false,

  loadInterfaces: async () => {
    set({ isLoadingInterfaces: true });
    try {
      const interfaces = await CaptureService.GetInterfaces();
      set({ interfaces: interfaces || [], isLoadingInterfaces: false });
    } catch (err) {
      console.error("Failed to load interfaces:", err);
      set({ isLoadingInterfaces: false });
    }
  },

  startCapture: async (sessionName, iface, filter, promiscuous) => {
    try {
      await CaptureService.StartCapture(
        sessionName,
        iface,
        filter,
        promiscuous,
      );
      // Status will be updated via event listener
    } catch (err) {
      console.error("Failed to start capture:", err);
      set({
        status: new CaptureStatus({
          ...DEFAULT_STATUS,
          State: CaptureState.StateError,
          ErrorMessage: String(err),
        }),
      });
    }
  },

  stopCapture: async () => {
    try {
      await CaptureService.StopCapture();
      // Status will be updated via event listener
    } catch (err) {
      console.error("Failed to stop capture:", err);
    }
  },

  updateStatus: (status) => set({ status }),
}));
