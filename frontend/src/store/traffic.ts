import { create } from "zustand";
import { TrafficSnapshot } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

interface TrafficStore {
  currentSnapshot: TrafficSnapshot | null;
  snapshotHistory: TrafficSnapshot[];
  maxHistorySize: number;

  // Actions
  updateSnapshot: (snapshot: TrafficSnapshot) => void;
  clearHistory: () => void;
}

const HISTORY_SIZE = 120; // 2 minutes at 1 snapshot/second

export const useTrafficStore = create<TrafficStore>((set) => ({
  currentSnapshot: null,
  snapshotHistory: [],
  maxHistorySize: HISTORY_SIZE,

  updateSnapshot: (snapshot) =>
    set((state) => {
      const newHistory = [...state.snapshotHistory, snapshot];
      // Keep only the most recent snapshots
      if (newHistory.length > HISTORY_SIZE) {
        newHistory.shift();
      }
      return {
        currentSnapshot: snapshot,
        snapshotHistory: newHistory,
      };
    }),

  clearHistory: () =>
    set({
      currentSnapshot: null,
      snapshotHistory: [],
    }),
}));
