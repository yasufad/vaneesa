import React, { useState, useCallback, ReactNode } from "react";
import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  SelectTabEvent,
  SelectTabData,
} from "@fluentui/react-components";
import {
  Board24Regular,
  Link24Regular,
  Desktop24Regular,
  ProtocolHandler24Regular,
  Alert24Regular,
  History24Regular,
  Settings24Regular,
} from "@fluentui/react-icons";
import { useNavigationStore, ViewType } from "../store/navigation";

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  contentContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    minWidth: "50px",
    maxWidth: "400px",
  },
  mainViewport: {
    flex: 1,
    padding: tokens.spacingHorizontalL,
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  resizer: {
    width: "4px",
    backgroundColor: "transparent",
    cursor: "col-resize",
    "&:hover": {
      backgroundColor: tokens.colorNeutralStroke1Hover,
    },
    transition: "background-color 0.2s ease",
  },
  tabList: {
    padding: tokens.spacingVerticalM,
  },
  statusBar: {
    height: "28px",
    display: "flex",
    alignItems: "center",
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
});

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const styles = useStyles();
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const activeView = useNavigationStore((state) => state.activeView);
  const setActiveView = useNavigationStore((state) => state.setActiveView);

  const handleTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
    setActiveView(data.value as ViewType);
  };

  const handleResize = useCallback((e: MouseEvent) => {
    setSidebarWidth(e.clientX);
  }, []);

  const stopResize = useCallback(() => {
    window.removeEventListener("mousemove", handleResize);
    window.removeEventListener("mouseup", stopResize);
  }, [handleResize]);

  const startResize = useCallback(() => {
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
  }, [handleResize, stopResize]);

  return (
    <div className={styles.root}>
      <div className={styles.contentContainer}>
        {/* Sidebar */}
        <div className={styles.sidebar} style={{ width: sidebarWidth }}>
          <TabList
            vertical
            className={styles.tabList}
            selectedValue={activeView}
            onTabSelect={handleTabSelect}
          >
            <Tab icon={<Board24Regular />} value="dashboard">
              Dashboard
            </Tab>
            <Tab icon={<Link24Regular />} value="connections">
              Connections
            </Tab>
            <Tab icon={<Desktop24Regular />} value="hosts">
              Hosts
            </Tab>
            <Tab icon={<ProtocolHandler24Regular />} value="protocols">
              Protocols
            </Tab>
            <Tab icon={<Alert24Regular />} value="alerts">
              Alerts
            </Tab>
            <Tab icon={<History24Regular />} value="sessions">
              Sessions
            </Tab>
          </TabList>

          <div style={{ flex: 1 }} />

          <TabList
            vertical
            className={styles.tabList}
            selectedValue={activeView}
            onTabSelect={handleTabSelect}
          >
            <Tab icon={<Settings24Regular />} value="settings">
              Settings
            </Tab>
          </TabList>
        </div>

        {/* Resizer handle */}
        <div className={styles.resizer} onMouseDown={startResize} />

        {/* Main Area */}
        <main className={styles.mainViewport}>{children}</main>
      </div>

      {/* Bottom Status Bar */}
      <footer className={styles.statusBar}>Offline | No Session Active</footer>
    </div>
  );
};
