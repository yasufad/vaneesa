import { Events } from "@wailsio/runtime";
import { useCaptureStore } from "../store/capture";
import { useTrafficStore } from "../store/traffic";
import { useNavigationStore } from "../store/navigation";

// Initialise all Wails event listeners. This function is called once at
// application startup from main.tsx. All events are wired to Zustand stores
// so components never interact with the Wails event system directly.
export function initialiseEventListeners() {
  // Capture status updates
  Events.On("vaneesa:status", (status: any) => {
    useCaptureStore.getState().updateStatus(status);
  });

  // Traffic snapshots (emitted every second during capture)
  Events.On("vaneesa:snapshot", (snapshot: any) => {
    useTrafficStore.getState().updateSnapshot(snapshot);
  });

  // Alerts (emitted immediately when detected)
  Events.On("vaneesa:alert", (alert: any) => {
    console.log("Alert received:", alert);
    // TODO: Wire to alerts store when implemented
  });

  // Menu navigation events
  Events.On("menu:navigate", (ev) => {
    const view = ev.data;
    const validViews = [
      "dashboard",
      "connections",
      "hosts",
      "protocols",
      "alerts",
      "sessions",
      "settings",
    ];
    if (typeof view === "string" && validViews.includes(view)) {
      useNavigationStore.getState().setActiveView(view as any);
    }
  });

  // Theme change events
  Events.On("theme:changed", (ev) => {
    const theme = ev.data;
    console.log("Theme changed:", theme);
    // TODO: Wire to theme store when implemented
  });
}
