import { makeStyles, tokens, Title2, Card } from "@fluentui/react-components";
import {
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  PlugConnected24Regular,
  Desktop24Regular,
} from "@fluentui/react-icons";
import { CaptureControl } from "../components/CaptureControl";
import { useTrafficStore } from "../store/traffic";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    height: "100%",
    overflow: "hidden",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
  },
  metricCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
  },
  metricLabel: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  metricValue: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: "1.1",
  },
  metricNote: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
  },
  chartCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  chartTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  chartArea: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    minHeight: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    textAlign: "center" as const,
    padding: tokens.spacingHorizontalL,
    lineHeight: "1.6",
  },
  bottomRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalM,
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
  },
  sectionCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 56px 72px",
    gap: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  skeletonList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    overflow: "auto",
    flex: 1,
  },
  skeletonGridRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 56px 72px",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
  alertRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  alertBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
});

// Varying widths give placeholder rows a realistic feel
const TALKER_ROWS = [
  ["72%", "78%", "60%", "85%"],
  ["60%", "55%", "100%", "60%"],
  ["88%", "68%", "70%", "72%"],
  ["64%", "82%", "100%", "52%"],
  ["78%", "62%", "70%", "90%"],
];

const ALERT_ROWS = [
  { dot: tokens.colorPaletteRedForeground1, w1: "78%", w2: "55%" },
  { dot: tokens.colorPaletteYellowForeground1, w1: "65%", w2: "48%" },
  { dot: tokens.colorPaletteYellowForeground1, w1: "88%", w2: "50%" },
  { dot: tokens.colorNeutralForeground3, w1: "70%", w2: "62%" },
];

export const DashboardView = () => {
  const styles = useStyles();
  const currentSnapshot = useTrafficStore((state) => state.currentSnapshot);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const bytesIn = currentSnapshot?.BytesIn ?? 0;
  const bytesOut = currentSnapshot?.BytesOut ?? 0;
  const activeFlows = currentSnapshot?.FlowDeltas.filter((f) => !f.Closed).length ?? 0;
  const uniqueHosts = currentSnapshot
    ? new Set([
        ...currentSnapshot.FlowDeltas.map((f) => f.Key.SrcIP.join(".")),
        ...currentSnapshot.FlowDeltas.map((f) => f.Key.DstIP.join(".")),
      ]).size
    : 0;

  const hasData = currentSnapshot !== null;

  return (
    <div className={styles.root}>
      <div>
        <Title2>Dashboard</Title2>
        <div
          style={{
            color: tokens.colorNeutralForeground3,
            fontSize: tokens.fontSizeBase200,
            marginTop: tokens.spacingVerticalXXS,
          }}
        >
          Real-time network traffic overview, start a capture session to
          populate this view.
        </div>
      </div>

      <CaptureControl />

      <div className={styles.metricsGrid}>
        <Card className={styles.metricCard}>
          <div className={styles.metricLabel}>
            <ArrowDownload24Regular style={{ fontSize: "14px" }} />
            <span>Bytes In / s</span>
          </div>
          <div className={styles.metricValue}>
            {hasData ? formatBytes(bytesIn) : "—"}
          </div>
          <div className={styles.metricNote}>
            {hasData ? `${formatNumber(currentSnapshot.PacketsIn)} packets` : "No active capture"}
          </div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricLabel}>
            <ArrowUpload24Regular style={{ fontSize: "14px" }} />
            <span>Bytes Out / s</span>
          </div>
          <div className={styles.metricValue}>
            {hasData ? formatBytes(bytesOut) : "—"}
          </div>
          <div className={styles.metricNote}>
            {hasData ? `${formatNumber(currentSnapshot.PacketsOut)} packets` : "No active capture"}
          </div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricLabel}>
            <PlugConnected24Regular style={{ fontSize: "14px" }} />
            <span>Active Connections</span>
          </div>
          <div className={styles.metricValue}>
            {hasData ? formatNumber(activeFlows) : "—"}
          </div>
          <div className={styles.metricNote}>
            {hasData ? "flows" : "No active capture"}
          </div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricLabel}>
            <Desktop24Regular style={{ fontSize: "14px" }} />
            <span>Discovered Hosts</span>
          </div>
          <div className={styles.metricValue}>
            {hasData ? formatNumber(uniqueHosts) : "—"}
          </div>
          <div className={styles.metricNote}>
            {hasData ? "unique IPs" : "No active capture"}
          </div>
        </Card>
      </div>

      <div className={styles.chartsRow}>
        <Card className={styles.chartCard}>
          <span className={styles.chartTitle}>Bandwidth — Last 2 Minutes</span>
          <div className={styles.chartArea}>
            Time-series bandwidth graph will render here.
            <br />
            <span style={{ opacity: 0.7 }}>
              Bytes/s inbound vs. outbound at 1-second resolution.
            </span>
          </div>
        </Card>
        <Card className={styles.chartCard}>
          <span className={styles.chartTitle}>Protocol Distribution</span>
          <div className={styles.chartArea}>
            Pie chart will render here.
            <br />
            <span style={{ opacity: 0.7 }}>TCP · UDP · ICMP · DNS · ARP</span>
          </div>
        </Card>
      </div>

      <div className={styles.bottomRow}>
        <Card className={styles.sectionCard}>
          <span className={styles.sectionTitle}>Top Talkers by Volume</span>
          <div className={styles.colHeaders}>
            <span>Source IP</span>
            <span>Destination</span>
            <span>Proto</span>
            <span>Bytes</span>
          </div>
          <div className={styles.skeletonList}>
            {TALKER_ROWS.map((widths, i) => (
              <div key={i} className={styles.skeletonGridRow}>
                {widths.map((w, j) => (
                  <div
                    key={j}
                    className={styles.skeletonBar}
                    style={{ width: w }}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card className={styles.sectionCard}>
          <span className={styles.sectionTitle}>Recent Alerts</span>
          <div className={styles.skeletonList}>
            {ALERT_ROWS.map(({ dot, w1, w2 }, i) => (
              <div key={i} className={styles.alertRow}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: dot,
                    flexShrink: 0,
                  }}
                />
                <div className={styles.alertBody}>
                  <div className={styles.skeletonBar} style={{ width: w1 }} />
                  <div
                    className={styles.skeletonBar}
                    style={{ width: w2, height: "9px", opacity: 0.6 }}
                  />
                </div>
                <div className={styles.skeletonBar} style={{ width: "54px" }} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
