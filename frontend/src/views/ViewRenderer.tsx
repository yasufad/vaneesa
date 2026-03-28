import { useNavigationStore } from "../store/navigation";
import { SettingsView } from "./SettingsView";

// Placeholder components for each view
const Dashboard = () => <div>Dashboard View Loading...</div>;
const Connections = () => <div>Connections View Loading...</div>;
const Hosts = () => <div>Hosts View Loading...</div>;
const Protocols = () => <div>Protocols View Loading...</div>;
const Alerts = () => <div>Alerts View Loading...</div>;
const Sessions = () => <div>Sessions View Loading...</div>;

export const ViewRenderer = () => {
  const activeView = useNavigationStore((state) => state.activeView);

  switch (activeView) {
    case "dashboard":
      return <Dashboard />;
    case "connections":
      return <Connections />;
    case "hosts":
      return <Hosts />;
    case "protocols":
      return <Protocols />;
    case "alerts":
      return <Alerts />;
    case "sessions":
      return <Sessions />;
    case "settings":
      return <SettingsView />;
    default:
      return <Dashboard />;
  }
};
