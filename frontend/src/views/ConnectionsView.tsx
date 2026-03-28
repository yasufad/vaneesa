import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Input,
  Button,
  Dropdown,
  Option,
  Badge,
} from "@fluentui/react-components";
import {
  Search24Regular,
  Filter24Regular,
  Pause24Regular,
  PlugConnected24Regular,
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

// Skeleton rows with varied widths to simulate real IP/port data
const SKELETON_ROWS = [
  { widths: ["78%", "82%", "55%", "65%", "70%", "60%", "50%"], proto: "TCP" },
  { widths: ["65%", "72%", "100%", "80%", "55%", "75%", "70%"], proto: "UDP" },
  { widths: ["88%", "60%", "55%", "65%", "80%", "55%", "60%"], proto: "TCP" },
  { widths: ["70%", "85%", "100%", "55%", "65%", "80%", "45%"], proto: "DNS" },
  { widths: ["82%", "68%", "55%", "70%", "72%", "65%", "55%"], proto: "TCP" },
  { widths: ["60%", "78%", "100%", "80%", "58%", "70%", "65%"], proto: "UDP" },
  { widths: ["75%", "65%", "55%", "65%", "85%", "60%", "50%"], proto: "TCP" },
  { widths: ["90%", "70%", "100%", "55%", "62%", "78%", "60%"], proto: "ICMP" },
];

const PROTO_COLOURS: Record<string, string> = {
  TCP:  tokens.colorPaletteGreenForeground1,
  UDP:  tokens.colorPaletteBlueForeground2,
  DNS:  tokens.colorPalettePurpleForeground2,
  ICMP: tokens.colorPaletteYellowForeground1,
};

export const ConnectionsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Title2>Connections</Title2>
          <Badge appearance="filled" color="informative" size="medium">
            Live
          </Badge>
        </div>
        <span style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 }}>
          No active capture — flows will appear here once monitoring begins.
        </span>
      </div>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Filter by IP address or port…"
          contentBefore={<Search24Regular style={{ fontSize: "16px" }} />}
          size="small"
        />
        <Dropdown placeholder="Protocol" size="small" style={{ minWidth: "110px" }}>
          <Option>All protocols</Option>
          <Option>TCP</Option>
          <Option>UDP</Option>
          <Option>ICMP</Option>
          <Option>DNS</Option>
        </Dropdown>
        <Dropdown placeholder="Sort by" size="small" style={{ minWidth: "120px" }}>
          <Option>Bytes (desc)</Option>
          <Option>Duration (desc)</Option>
          <Option>Source IP</Option>
          <Option>Destination IP</Option>
        </Dropdown>
        <Button icon={<Filter24Regular />} size="small" appearance="subtle">Filters</Button>
        <div style={{ flex: 1 }} />
        <Button icon={<Pause24Regular />} size="small" appearance="outline" disabled>
          Pause updates
        </Button>
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
          {SKELETON_ROWS.map(({ widths, proto }, i) => (
            <div key={i} className={styles.tableRow}>
              {widths.slice(0, 4).map((w, j) => (
                <div key={j} className={styles.skeletonBar} style={{ width: w }} />
              ))}
              <div>
                <Badge
                  appearance="tint"
                  size="small"
                  style={{ color: PROTO_COLOURS[proto] }}
                >
                  {proto}
                </Badge>
              </div>
              <div className={styles.skeletonBar} style={{ width: widths[5] }} />
              <div className={styles.skeletonBar} style={{ width: widths[6] }} />
            </div>
          ))}

          <div className={styles.emptyHint}>
            <PlugConnected24Regular style={{ fontSize: "32px", opacity: 0.3 }} />
            <span style={{ fontSize: tokens.fontSizeBase200 }}>
              Start a capture session to begin tracking live network flows.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
