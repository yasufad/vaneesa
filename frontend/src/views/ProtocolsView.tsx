import {
  makeStyles,
  tokens,
  Title2,
  Card,
} from "@fluentui/react-components";
import { ProtocolHandler24Regular } from "@fluentui/react-icons";
import { useCaptureStore } from "../store/capture";
import { useTrafficStore } from "../store/traffic";
import { Protocol } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";
import { ProtocolChart } from "../components/ProtocolChart";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    height: "100%",
    overflow: "hidden",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
  timeRangeGroup: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  chartCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    flexShrink: 0,
  },
  chartTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  chartArea: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    height: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    textAlign: "center" as const,
    padding: tokens.spacingHorizontalL,
    lineHeight: "1.6",
    gap: tokens.spacingVerticalS,
  },
  breakdownCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
  },
  breakdownTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  breakdownList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    overflow: "auto",
    flex: 1,
  },
  protocolRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  protocolName: {
    width: "56px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: "8px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: tokens.borderRadiusCircular,
    opacity: 0.25,
  },
  protocolPct: {
    width: "44px",
    textAlign: "right" as const,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "56px 1fr 44px 80px 80px",
    gap: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  detailRow: {
    display: "grid",
    gridTemplateColumns: "56px 1fr 44px 80px 80px",
    gap: tokens.spacingHorizontalM,
    alignItems: "center",
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
});

export const ProtocolsView = () => {
  const styles = useStyles();
  const { status } = useCaptureStore();
  const { currentSnapshot } = useTrafficStore();

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
      case Protocol.ProtoTCP: return tokens.colorPaletteGreenBackground2;
      case Protocol.ProtoUDP: return tokens.colorPaletteBlueForeground2;
      case Protocol.ProtoICMP: return tokens.colorPaletteYellowBackground2;
      case Protocol.ProtoICMPv6: return tokens.colorPalettePurpleBackground2;
      case Protocol.ProtoARP: return tokens.colorPaletteRedBackground2;
      default: return tokens.colorNeutralBackground5;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalBytes = currentSnapshot?.ProtocolStats?.reduce((sum, stat) => sum + stat.Bytes, 0) || 0;
  const hasActiveCapture = status.SessionID !== 0;

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <Title2>Protocols</Title2>
          <div className={styles.subtitle}>
            {hasActiveCapture
              ? "Network activity distribution over time"
              : "Network activity distribution over time — start a capture session to populate this view."}
          </div>
        </div>
      </div>

      <Card className={styles.chartCard}>
        <span className={styles.chartTitle}>Protocol Distribution</span>
        {hasActiveCapture && currentSnapshot ? (
          <div style={{ height: "280px" }}>
            <ProtocolChart />
          </div>
        ) : (
          <div className={styles.chartArea}>
            <ProtocolHandler24Regular style={{ fontSize: "28px", opacity: 0.3 }} />
            <span>
              Protocol distribution chart will render here.<br />
              <span style={{ opacity: 0.7 }}>Start a capture to see live protocol breakdown.</span>
            </span>
          </div>
        )}
      </Card>

      <Card className={styles.breakdownCard}>
        <span className={styles.breakdownTitle}>Protocol Breakdown</span>

        {!hasActiveCapture && (
          <div style={{ padding: tokens.spacingVerticalXL, textAlign: "center", color: tokens.colorNeutralForeground3 }}>
            Start a capture to see protocol statistics
          </div>
        )}

        {hasActiveCapture && currentSnapshot && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL, flexShrink: 0 }}>
              {currentSnapshot.ProtocolStats.map((stat) => {
                const pct = totalBytes > 0 ? ((stat.Bytes / totalBytes) * 100).toFixed(1) : "0.0";
                return (
                  <div key={stat.Protocol} className={styles.protocolRow}>
                    <span className={styles.protocolName}>{getProtocolName(stat.Protocol)}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: getProtocolColour(stat.Protocol),
                        }}
                      />
                    </div>
                    <span className={styles.protocolPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>

            <div style={{ height: "1px", backgroundColor: tokens.colorNeutralStroke2, marginTop: tokens.spacingVerticalS }} />

            <div className={styles.colHeaders}>
              <span>Protocol</span>
              <span>Proportion</span>
              <span>%</span>
              <span>Bytes</span>
              <span>Packets</span>
            </div>

            <div className={styles.breakdownList}>
              {currentSnapshot.ProtocolStats.map((stat) => {
                const pct = totalBytes > 0 ? ((stat.Bytes / totalBytes) * 100).toFixed(1) : "0.0";
                return (
                  <div key={stat.Protocol} className={styles.detailRow}>
                    <span style={{ fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold }}>
                      {getProtocolName(stat.Protocol)}
                    </span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: getProtocolColour(stat.Protocol),
                        }}
                      />
                    </div>
                    <span className={styles.protocolPct}>{pct}%</span>
                    <span style={{ fontSize: tokens.fontSizeBase200 }}>{formatBytes(stat.Bytes)}</span>
                    <span style={{ fontSize: tokens.fontSizeBase200 }}>{stat.Packets.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
