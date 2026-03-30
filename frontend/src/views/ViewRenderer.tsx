import { useNavigationStore } from "../store/navigation";
import { DashboardView } from "./DashboardView";
import { ConnectionsView } from "./ConnectionsView";
import { HostsView } from "./HostsView";
import { ProtocolsView } from "./ProtocolsView";
import { AlertsView } from "./AlertsView";
import { SessionsView } from "./SessionsView";
import { SettingsView } from "./SettingsView";

export const ViewRenderer = () => {
  const activeView = useNavigationStore((state) => state.activeView);

  return (
    <>
      <div style={{ display: activeView === "dashboard" ? "block" : "none" }}>
        <DashboardView />
      </div>
      <div style={{ display: activeView === "connections" ? "block" : "none" }}>
        <ConnectionsView />
      </div>
      <div style={{ display: activeView === "hosts" ? "block" : "none" }}>
        <HostsView />
      </div>
      <div style={{ display: activeView === "protocols" ? "block" : "none" }}>
        <ProtocolsView />
      </div>
      <div style={{ display: activeView === "alerts" ? "block" : "none" }}>
        <AlertsView />
      </div>
      <div style={{ display: activeView === "sessions" ? "block" : "none" }}>
        <SessionsView />
      </div>
      <div style={{ display: activeView === "settings" ? "block" : "none" }}>
        <SettingsView />
      </div>
    </>
  );
};
