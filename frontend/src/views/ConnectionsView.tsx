import { useEffect, useState } from "react";
import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Input,
  Dropdown,
  Option,
  Badge,
} from "@fluentui/react-components";
import {
  Search24Regular,
  PlugConnected24Regular,
} from "@fluentui/react-icons";
import { useCaptureStore } from "../store/capture";
import * as FlowService from "../../bindings/github.com/yasufad/vaneesa/flowservice";
import { FlowRecord, Protocol } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  searchInput: {
    flex: 1,
    maxWidth: "320px",
  },
  tableCard: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
    padding: 0,
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "160px 160px 72px 72px 90px 90px 80px",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  rowList: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "auto",
    padding: `${tokens.spacingVerticalXS} 0`,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "160px 160px 72px 72px 90px 90px 80px",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    alignItems: "center",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
  protoBadge: {
    flexShrink: 0,
  },
  emptyHint: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
  },
});

export const ConnectionsView = () => {
  const styles = useStyles();
  const { status } = useCaptureStore();
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");

  useEffect(() => {
    if (status.SessionID === 0) {
      setFlows([]);
      return;
    }

    const loadFlows = async () => {
      setLoading(true);
      try {
        const result = await FlowService.GetPagedFlows(status.SessionID, 0, 100);
        setFlows(result?.Flows || []);
      } catch (err) {
        console.error("Failed to load flows:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFlows();
    const interval = setInterval(loadFlows, 2000);
    return () => clearInterval(interval);
  }, [status.SessionID]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (started: string, lastSeen: string): string => {
    const start = new Date(started).getTime();
    const end = new Date(lastSeen).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  };

  const getProtocolName = (proto: Protocol): string => {
    switch (proto) {
      case Protocol.ProtoTCP: return "TCP";
      case Protocol.ProtoUDP: return "UDP";
      case Protocol.ProtoICMP: return "ICMP";
      case Protocol.ProtoICMPv6: return "ICMPv6";
      case Protocol.ProtoARP: return "ARP";
      default: return "Other";
    }
  };

  const getProtocolColour = (proto: Protocol): string => {
    switch (proto) {
      case Protocol.ProtoTCP: return tokens.colorPaletteGreenForeground1;
      case Protocol.ProtoUDP: return tokens.colorPaletteBlueForeground2;
      case Protocol.ProtoICMP: return tokens.colorPaletteYellowForeground1;
      case Protocol.ProtoICMPv6: return tokens.colorPalettePurpleForeground2;
      default: return tokens.colorNeutralForeground3;
    }
  };

  const filteredFlows = flows.filter((flow) => {
    const matchesSearch = searchFilter === "" ||
      flow.SrcIP?.includes(searchFilter) ||
      flow.DstIP?.includes(searchFilter) ||
      flow.SrcPort?.toString().includes(searchFilter) ||
      flow.DstPort?.toString().includes(searchFilter);

    const matchesProtocol = protocolFilter === "all" ||
      (protocolFilter === "tcp" && flow.Protocol === Protocol.ProtoTCP) ||
      (protocolFilter === "udp" && flow.Protocol === Protocol.ProtoUDP) ||
      (protocolFilter === "icmp" && (flow.Protocol === Protocol.ProtoICMP || flow.Protocol === Protocol.ProtoICMPv6));

    return matchesSearch && matchesProtocol;
  });

  const hasActiveCapture = status.SessionID !== 0;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Title2>Connections</Title2>
          {hasActiveCapture && (
            <Badge appearance="filled" color="success" size="medium">
              Live
            </Badge>
          )}
        </div>
        <span
          style={{
            fontSize: tokens.fontSizeBase200,
            color: tokens.colorNeutralForeground3,
          }}
        >
          {hasActiveCapture
            ? `${filteredFlows.length} active flows`
            : "No active capture — flows will appear here once monitoring begins."}
        </span>
      </div>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Filter by IP address or port…"
          contentBefore={<Search24Regular style={{ fontSize: "16px" }} />}
          size="small"
          value={searchFilter}
          onChange={(_, data) => setSearchFilter(data.value)}
        />
        <Dropdown
          placeholder="Protocol"
          size="small"
          style={{ minWidth: "110px" }}
          value={protocolFilter === "all" ? "All protocols" : protocolFilter.toUpperCase()}
          onOptionSelect={(_, data) => setProtocolFilter(data.optionValue as string)}
        >
          <Option value="all" text="All protocols">All protocols</Option>
          <Option value="tcp" text="TCP">TCP</Option>
          <Option value="udp" text="UDP">UDP</Option>
          <Option value="icmp" text="ICMP">ICMP</Option>
        </Dropdown>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.colHeaders}>
          <span>Source IP</span>
          <span>Destination IP</span>
          <span>Src Port</span>
          <span>Dst Port</span>
          <span>Protocol</span>
          <span>Bytes</span>
          <span>Duration</span>
        </div>

        <div className={styles.rowList}>
          {!hasActiveCapture && (
            <div className={styles.emptyHint}>
              <PlugConnected24Regular
                style={{ fontSize: "32px", opacity: 0.3 }}
              />
              <span style={{ fontSize: tokens.fontSizeBase200 }}>
                Start a capture session to begin tracking live network flows.
              </span>
            </div>
          )}

          {hasActiveCapture && filteredFlows.length === 0 && !loading && (
            <div className={styles.emptyHint}>
              <span style={{ fontSize: tokens.fontSizeBase200 }}>
                No flows match the current filters.
              </span>
            </div>
          )}

          {filteredFlows.map((flow) => (
            <div key={flow.ID} className={styles.tableRow}>
              <span>{flow.SrcIP || "—"}</span>
              <span>{flow.DstIP || "—"}</span>
              <span>{flow.SrcPort || "—"}</span>
              <span>{flow.DstPort || "—"}</span>
              <div>
                <Badge
                  appearance="tint"
                  size="small"
                  style={{ color: getProtocolColour(flow.Protocol) }}
                >
                  {getProtocolName(flow.Protocol)}
                </Badge>
              </div>
              <span>{formatBytes(flow.BytesIn + flow.BytesOut)}</span>
              <span>{formatDuration(flow.StartedAt, flow.LastSeenAt)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
