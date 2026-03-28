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

const PLACEHOLDER_HOSTS = [
  { ipW: "78%", macW: "90%", badge: "TCP" },
  { ipW: "65%", macW: "85%", badge: "UDP" },
  { ipW: "82%", macW: "78%", badge: "TCP" },
  { ipW: "70%", macW: "92%", badge: "DNS" },
  { ipW: "88%", macW: "80%", badge: "TCP" },
  { ipW: "60%", macW: "88%", badge: "UDP" },
];

export const HostsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Hosts</Title2>
        <div className={styles.subtitle}>
          Devices discovered passively from network traffic — click a host to view its profile.
        </div>
      </div>

      <div className={styles.splitPane}>
        {/* Left: host list */}
        <Card className={styles.listCard}>
          <Input
            className={styles.searchInput}
            placeholder="Search by IP or MAC…"
            contentBefore={<Search24Regular style={{ fontSize: "16px" }} />}
            size="small"
          />
          <div className={styles.hostList}>
            {PLACEHOLDER_HOSTS.map(({ ipW, macW, badge }, i) => (
              <div key={i} className={styles.hostItem}>
                <div className={styles.hostIcon}>
                  <Desktop24Regular style={{ fontSize: "16px" }} />
                </div>
                <div className={styles.hostMeta}>
                  <div className={styles.skeletonBar} style={{ width: ipW }} />
                  <div className={styles.skeletonBar} style={{ width: macW, height: "9px", opacity: 0.6, marginTop: "4px" }} />
                </div>
                <Badge appearance="tint" size="small">{badge}</Badge>
                <ChevronRight24Regular style={{ fontSize: "14px", color: tokens.colorNeutralForeground3 }} />
              </div>
            ))}
          </div>
        </Card>

        {/* Right: detail panel empty state */}
        <Card className={styles.detailCard}>
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
        </Card>
      </div>
    </div>
  );
};
