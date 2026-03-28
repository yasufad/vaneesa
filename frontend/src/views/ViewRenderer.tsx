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

  switch (activeView) {
    case "dashboard":
      return <DashboardView />;
    case "connections":
      return <ConnectionsView />;
    case "hosts":
      return <HostsView />;
    case "protocols":
      return <ProtocolsView />;
    case "alerts":
      return <AlertsView />;
    case "sessions":
      return <SessionsView />;
    case "settings":
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
};
