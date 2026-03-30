import { Events } from "@wailsio/runtime";
import { useCaptureStore } from "../store/capture";
import { useTrafficStore } from "../store/traffic";
import { useNavigationStore } from "../store/navigation";
import * as CaptureService from "../../bindings/github.com/yasufad/vaneesa/captureservice";

// Initialise all Wails event listeners. This function is called once at
// application startup from main.tsx. All events are wired to Zustand stores
// so components never interact with the Wails event system directly.
export function initialiseEventListeners() {
  // Poll initial capture status on startup
  CaptureService.CaptureStatus()
    .then((status) => {
      useCaptureStore.getState().updateStatus(status);
    })
    .catch((err) => {
      console.error("Failed to poll initial capture status:", err);
    });

  // Capture status updates
  Events.On("vaneesa:status", (ev) => {
    useCaptureStore.getState().updateStatus(ev.data);
  });

  // Traffic snapshots (emitted every second during capture)
  Events.On("vaneesa:snapshot", (ev) => {
    useTrafficStore.getState().updateSnapshot(ev.data);
  });

  // Alerts (emitted immediately when detected)
  Events.On("vaneesa:alert", (ev) => {
    console.log("Alert received:", ev.data);
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
