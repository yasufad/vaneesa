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
  CheckmarkCircle24Regular,
} from "@fluentui/react-icons";

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

type Severity = "critical" | "high" | "medium" | "info";

const SEVERITY_CONFIG: Record<Severity, { colour: string; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
  critical: { colour: tokens.colorPaletteRedForeground1,    label: "Critical", Icon: ErrorCircle24Regular  },
  high:     { colour: tokens.colorPaletteRedForeground2,    label: "High",     Icon: Warning24Regular     },
  medium:   { colour: tokens.colorPaletteYellowForeground1, label: "Medium",   Icon: Warning24Regular     },
  info:     { colour: tokens.colorNeutralForeground3,        label: "Info",     Icon: Info24Regular        },
};

const SKELETON_ROWS: { severity: Severity; typeW: string; srcW: string; detailW: string; timeW: string }[] = [
  { severity: "critical", typeW: "75%", srcW: "70%", detailW: "80%", timeW: "85%" },
  { severity: "high",     typeW: "60%", srcW: "80%", detailW: "65%", timeW: "90%" },
  { severity: "medium",   typeW: "80%", srcW: "65%", detailW: "75%", timeW: "80%" },
  { severity: "info",     typeW: "55%", srcW: "75%", detailW: "60%", timeW: "70%" },
  { severity: "medium",   typeW: "70%", srcW: "60%", detailW: "85%", timeW: "85%" },
];

const FILTER_BUTTONS = [
  { label: "All",      appearance: "primary" },
  { label: "Critical", appearance: "subtle"  },
  { label: "High",     appearance: "subtle"  },
  { label: "Medium",   appearance: "subtle"  },
  { label: "Info",     appearance: "subtle"  },
] as const;

export const AlertsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Alerts</Title2>
        <div className={styles.subtitle}>
          Anomaly detection events — port scans, traffic spikes, SYN floods, and new device appearances.
        </div>
      </div>

      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Severity:</span>
        {FILTER_BUTTONS.map(({ label, appearance }) => (
          <Button key={label} size="small" appearance={appearance} disabled>
            {label}
          </Button>
        ))}
        <div className={styles.spacer} />
        <Button
          icon={<CheckmarkCircle24Regular />}
          size="small"
          appearance="subtle"
          disabled
        >
          Acknowledge all
        </Button>
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
          {SKELETON_ROWS.map(({ severity, typeW, srcW, detailW, timeW }, i) => {
            const cfg = SEVERITY_CONFIG[severity];
            return (
              <div key={i} className={styles.alertRow}>
                <div className={styles.severityDot} style={{ backgroundColor: cfg.colour }} />
                <Badge appearance="tint" size="small" style={{ color: cfg.colour }}>
                  {cfg.label}
                </Badge>
                <div className={styles.skeletonBar} style={{ width: typeW }} />
                <div className={styles.skeletonBar} style={{ width: srcW }} />
                <div className={styles.skeletonBar} style={{ width: detailW }} />
                <div className={styles.skeletonBar} style={{ width: timeW }} />
              </div>
            );
          })}

          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Alert24Regular style={{ fontSize: "24px", opacity: 0.4 }} />
            </div>
            <div className={styles.emptyTitle}>No alerts recorded</div>
            <div className={styles.emptyBody}>
              Alerts will appear here when the detector identifies rate spikes, port scans,
              SYN flood patterns, or previously unseen devices on the network.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
