import { useEffect, useState } from "react";
import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Input,
  Badge,
} from "@fluentui/react-components";
import {
  Search24Regular,
  Desktop24Regular,
  ChevronRight24Regular,
} from "@fluentui/react-icons";
import { useCaptureStore } from "../store/capture";
import * as HostService from "../../bindings/github.com/yasufad/vaneesa/hostservice";
import { HostRecord } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    flexShrink: 0,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
  splitPane: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: tokens.spacingHorizontalM,
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
  },
  listCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalS,
    overflow: "hidden",
  },
  searchInput: {
    flexShrink: 0,
  },
  hostList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "auto",
    flex: 1,
  },
  hostItem: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: "default",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  hostIcon: {
    width: "32px",
    height: "32px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  hostMeta: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "hidden",
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
  detailCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
    overflow: "hidden",
  },
  emptyIcon: {
    width: "64px",
    height: "64px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
  },
  emptyTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textAlign: "center" as const,
  },
  emptyBody: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: "center" as const,
    maxWidth: "320px",
    lineHeight: "1.6",
  },
});

export const HostsView = () => {
  const styles = useStyles();
  const { status } = useCaptureStore();
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [selectedHost, setSelectedHost] = useState<HostRecord | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (status.SessionID === 0) {
      setHosts([]);
      setSelectedHost(null);
      return;
    }

    const loadHosts = async () => {
      try {
        const result = await HostService.GetAllHosts(status.SessionID);
        setHosts(result || []);
      } catch (err) {
        console.error("Failed to load hosts:", err);
      }
    };

    loadHosts();
    const interval = setInterval(loadHosts, 3000);
    return () => clearInterval(interval);
  }, [status.SessionID]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const filteredHosts = hosts.filter((host) =>
    searchFilter === "" ||
    host.IP?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    host.MAC?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    host.Vendor?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const hasActiveCapture = status.SessionID !== 0;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Hosts</Title2>
        <div className={styles.subtitle}>
          Devices discovered passively from network traffic — click a host to view its profile.
        </div>
      </div>

      <div className={styles.splitPane}>
        <Card className={styles.listCard}>
          <Input
            className={styles.searchInput}
            placeholder="Search by IP or MAC…"
            contentBefore={<Search24Regular style={{ fontSize: "16px" }} />}
            size="small"
            value={searchFilter}
            onChange={(_, data) => setSearchFilter(data.value)}
          />
          <div className={styles.hostList}>
            {!hasActiveCapture && (
              <div style={{ padding: tokens.spacingVerticalL, textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                Start a capture to discover hosts
              </div>
            )}
            {hasActiveCapture && filteredHosts.length === 0 && (
              <div style={{ padding: tokens.spacingVerticalL, textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                No hosts discovered yet
              </div>
            )}
            {filteredHosts.map((host) => (
              <div
                key={host.ID}
                className={styles.hostItem}
                onClick={() => setSelectedHost(host)}
                style={{
                  backgroundColor: selectedHost?.ID === host.ID ? tokens.colorNeutralBackground2 : undefined,
                  cursor: "pointer",
                }}
              >
                <div className={styles.hostIcon}>
                  <Desktop24Regular style={{ fontSize: "16px" }} />
                </div>
                <div className={styles.hostMeta}>
                  <div style={{ fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold }}>
                    {host.IP || "Unknown"}
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                    {host.MAC || "No MAC"}
                  </div>
                </div>
                <Badge appearance="tint" size="small">
                  {formatBytes(host.BytesIn + host.BytesOut)}
                </Badge>
                <ChevronRight24Regular style={{ fontSize: "14px", color: tokens.colorNeutralForeground3 }} />
              </div>
            ))}
          </div>
        </Card>

        <Card className={styles.detailCard}>
          {!selectedHost && (
            <>
              <div className={styles.emptyIcon}>
                <Desktop24Regular style={{ fontSize: "28px" }} />
              </div>
              <div>
                <div className={styles.emptyTitle}>No host selected</div>
              </div>
              <div className={styles.emptyBody}>
                Select a host from the list to view its traffic profile, active connections,
                bandwidth history, and associated alerts.
              </div>
            </>
          )}
          {selectedHost && (
            <div style={{ width: "100%", padding: tokens.spacingHorizontalL }}>
              <Title2 style={{ marginBottom: tokens.spacingVerticalL }}>{selectedHost.IP}</Title2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingVerticalM }}>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    MAC Address
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {selectedHost.MAC || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    Vendor
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {selectedHost.Vendor || "Unknown"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    Bytes Sent
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {formatBytes(selectedHost.BytesOut)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    Bytes Received
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {formatBytes(selectedHost.BytesIn)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    Packets Sent
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {selectedHost.PacketsOut.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    Packets Received
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {selectedHost.PacketsIn.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    First Seen
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {new Date(selectedHost.FirstSeen).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    Last Seen
                  </div>
                  <div style={{ fontSize: tokens.fontSizeBase300 }}>
                    {new Date(selectedHost.LastSeen).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
