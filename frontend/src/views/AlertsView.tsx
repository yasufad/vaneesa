import { useEffect, useState } from "react";
import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Button,
  Badge,
} from "@fluentui/react-components";
import {
  Alert24Regular,
  ErrorCircle24Regular,
  Warning24Regular,
  Info24Regular,
} from "@fluentui/react-icons";
import { useCaptureStore } from "../store/capture";
import * as AlertService from "../../bindings/github.com/yasufad/vaneesa/alertservice";
import {
  Alert,
  AlertSeverity,
} from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

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
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  filterLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginRight: tokens.spacingHorizontalXS,
  },
  spacer: { flex: 1 },
  listCard: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
    padding: 0,
  },
  alertList: {
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    flex: 1,
  },
  alertRow: {
    display: "grid",
    gridTemplateColumns: "20px 100px 160px 180px 1fr 100px",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    alignItems: "center",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "20px 100px 160px 180px 1fr 100px",
    gap: tokens.spacingHorizontalM,
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
  severityDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    padding: tokens.spacingHorizontalXXL,
  },
  emptyIcon: {
    width: "56px",
    height: "56px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  emptyBody: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: "center" as const,
    maxWidth: "340px",
    lineHeight: "1.6",
  },
});

type Severity = "critical" | "warning" | "info";

const SEVERITY_CONFIG: Record<
  Severity,
  {
    colour: string;
    label: string;
    Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  }
> = {
  critical: {
    colour: tokens.colorPaletteRedForeground1,
    label: "Critical",
    Icon: ErrorCircle24Regular,
  },
  warning: {
    colour: tokens.colorPaletteYellowForeground1,
    label: "Warning",
    Icon: Warning24Regular,
  },
  info: {
    colour: tokens.colorNeutralForeground3,
    label: "Info",
    Icon: Info24Regular,
  },
};

const FILTER_BUTTONS = [
  { label: "All", appearance: "primary" },
  { label: "Critical", appearance: "subtle" },
  { label: "Warning", appearance: "subtle" },
  { label: "Info", appearance: "subtle" },
] as const;

export const AlertsView = () => {
  const styles = useStyles();
  const { status } = useCaptureStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  useEffect(() => {
    if (status.SessionID === 0) {
      setAlerts([]);
      return;
    }

    const loadAlerts = async () => {
      try {
        const result = await AlertService.GetPagedAlerts(
          status.SessionID,
          0,
          100,
        );
        setAlerts(result?.Alerts || []);
      } catch (err) {
        console.error("Failed to load alerts:", err);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 3000);
    return () => clearInterval(interval);
  }, [status.SessionID]);

  const getSeverityConfig = (
    sev: AlertSeverity,
  ): (typeof SEVERITY_CONFIG)[Severity] => {
    switch (sev) {
      case AlertSeverity.SeverityCritical:
        return SEVERITY_CONFIG.critical;
      case AlertSeverity.SeverityWarning:
        return SEVERITY_CONFIG.warning;
      case AlertSeverity.SeverityInfo:
        return SEVERITY_CONFIG.info;
      default:
        return SEVERITY_CONFIG.info;
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter === "all") return true;
    const cfg = getSeverityConfig(alert.Severity);
    return cfg.label.toLowerCase() === severityFilter.toLowerCase();
  });

  const hasActiveCapture = status.SessionID !== 0;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Alerts</Title2>
        <div className={styles.subtitle}>
          Anomaly detection events - port scans, traffic spikes, SYN floods, and
          new device appearances.
        </div>
      </div>

      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Severity:</span>
        {FILTER_BUTTONS.map(({ label, appearance }) => (
          <Button
            key={label}
            size="small"
            appearance={
              severityFilter === label.toLowerCase() ? "primary" : "subtle"
            }
            onClick={() => setSeverityFilter(label.toLowerCase())}
          >
            {label}
          </Button>
        ))}
        <div className={styles.spacer} />
      </div>

      <Card className={styles.listCard}>
        <div className={styles.colHeaders}>
          <span />
          <span>Severity</span>
          <span>Type</span>
          <span>Source IP</span>
          <span>Detail</span>
          <span>Time</span>
        </div>

        <div className={styles.alertList}>
          {!hasActiveCapture && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Alert24Regular style={{ fontSize: "24px", opacity: 0.4 }} />
              </div>
              <div className={styles.emptyTitle}>No alerts recorded</div>
              <div className={styles.emptyBody}>
                Alerts will appear here when the detector identifies rate
                spikes, port scans, SYN flood patterns, or previously unseen
                devices on the network.
              </div>
            </div>
          )}

          {hasActiveCapture && filteredAlerts.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>
                No alerts match the filter
              </div>
            </div>
          )}

          {filteredAlerts.map((alert) => {
            const cfg = getSeverityConfig(alert.Severity);
            return (
              <div
                key={alert.ID}
                className={styles.alertRow}
                style={{ opacity: alert.Acknowledged ? 0.5 : 1 }}
              >
                <div
                  className={styles.severityDot}
                  style={{ backgroundColor: cfg.colour }}
                />
                <Badge
                  appearance="tint"
                  size="small"
                  style={{ color: cfg.colour }}
                >
                  {cfg.label}
                </Badge>
                <span style={{ fontSize: tokens.fontSizeBase200 }}>
                  {alert.Type}
                </span>
                <span style={{ fontSize: tokens.fontSizeBase200 }}>
                  {alert.SrcIP || "—"}
                </span>
                <span style={{ fontSize: tokens.fontSizeBase200 }}>
                  {alert.Detail}
                </span>
                <span style={{ fontSize: tokens.fontSizeBase200 }}>
                  {new Date(alert.Timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
