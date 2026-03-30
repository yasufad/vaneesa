import { create } from "zustand";

// TrafficSnapshot matches the Go struct from internal/types/types.go
// These types are received via Wails events, not service calls, so they're
// not in the auto-generated bindings. Field names match Go's JSON serialisation.
interface ProtocolStats {
  Protocol: number;
  Bytes: number;
  Packets: number;
}

interface TrafficSnapshot {
  IntervalStart: string;
  IntervalEnd: string;
  BytesIn: number;
  BytesOut: number;
  PacketsIn: number;
  PacketsOut: number;
  ProtocolStats: ProtocolStats[];
  OverflowDrops: number;
}

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
