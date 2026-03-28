import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  Divider,
} from "@fluentui/react-components";
import {
  Add24Regular,
  History24Regular,
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  Record24Regular,
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
    gridTemplateColumns: "300px 1fr",
    gap: tokens.spacingHorizontalL,
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
  },
  listCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    overflow: "hidden",
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  listTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "auto",
    flex: 1,
  },
  sessionItem: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
    cursor: "default",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  sessionMeta: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    overflow: "hidden",
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
  sessionDuration: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  actionsPane: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    overflow: "auto",
  },
  actionCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
  },
  actionHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  actionIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
  },
  actionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  actionDesc: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    lineHeight: "1.5",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalM,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  exportRow: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap" as const,
  },
});

const PLACEHOLDER_SESSIONS = [
  { nameW: "72%", dateW: "60%", duration: "—", active: false },
  { nameW: "58%", dateW: "65%", duration: "—", active: false },
  { nameW: "80%", dateW: "55%", duration: "—", active: false },
  { nameW: "65%", dateW: "70%", duration: "—", active: false },
];

export const SessionsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Sessions</Title2>
        <div className={styles.subtitle}>
          Manage capture sessions, import PCAP files for replay, and export collected data.
        </div>
      </div>

      <div className={styles.splitPane}>
        {/* Left: session history */}
        <Card className={styles.listCard}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Session History</span>
            <History24Regular style={{ fontSize: "16px", color: tokens.colorNeutralForeground3 }} />
          </div>

          <Divider />

          <div className={styles.sessionList}>
            {PLACEHOLDER_SESSIONS.map(({ nameW, dateW, duration, active }, i) => (
              <div key={i} className={styles.sessionItem}>
                <div
                  className={styles.statusDot}
                  style={{
                    backgroundColor: active
                      ? tokens.colorPaletteGreenForeground1
                      : tokens.colorNeutralBackground5,
                  }}
                />
                <div className={styles.sessionMeta}>
                  <div className={styles.skeletonBar} style={{ width: nameW }} />
                  <div
                    className={styles.skeletonBar}
                    style={{ width: dateW, height: "9px", opacity: 0.6, marginTop: "4px" }}
                  />
                </div>
                <span className={styles.sessionDuration}>{duration}</span>
              </div>
            ))}

            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: tokens.spacingVerticalS,
              color: tokens.colorNeutralForeground3,
              padding: tokens.spacingHorizontalL,
              textAlign: "center",
            }}>
              <History24Regular style={{ fontSize: "28px", opacity: 0.3 }} />
              <span style={{ fontSize: tokens.fontSizeBase200 }}>
                Past sessions will appear here.<br />Start a capture to record your first session.
              </span>
            </div>
          </div>
        </Card>

        {/* Right: action cards */}
        <div className={styles.actionsPane}>
          {/* New Live Session */}
          <Card className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIconWrap}>
                <Record24Regular style={{ fontSize: "20px" }} />
              </div>
              <span className={styles.actionTitle}>New Live Session</span>
            </div>
            <div className={styles.actionDesc}>
              Select a network interface, name your session, and begin live packet capture.
              Vaneesa will monitor all traffic on the chosen interface and build a real-time picture of activity.
            </div>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <Label htmlFor="session-interface" size="small">Interface</Label>
                <Dropdown id="session-interface" placeholder="Select interface…" size="small" disabled>
                  <Option>eth0</Option>
                </Dropdown>
              </div>
              <div className={styles.fieldGroup}>
                <Label htmlFor="session-name" size="small">Session Name</Label>
                <Input id="session-name" placeholder="e.g. Office Network Debug" size="small" disabled />
              </div>
            </div>
            <div>
              <Button appearance="primary" icon={<Add24Regular />} disabled>
                Start Capture
              </Button>
            </div>
          </Card>

          {/* Import PCAP */}
          <Card className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIconWrap}>
                <ArrowUpload24Regular style={{ fontSize: "20px" }} />
              </div>
              <span className={styles.actionTitle}>Import PCAP File</span>
            </div>
            <div className={styles.actionDesc}>
              Open a <code>.pcap</code> file captured elsewhere and replay it through the Vaneesa analysis
              pipeline. The entire UI — Dashboard, Connections, Hosts, Alerts — works identically in replay mode.
            </div>
            <div>
              <Button appearance="outline" icon={<ArrowUpload24Regular />} disabled>
                Choose PCAP File…
              </Button>
            </div>
          </Card>

          {/* Export Data */}
          <Card className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIconWrap}>
                <ArrowDownload24Regular style={{ fontSize: "20px" }} />
              </div>
              <span className={styles.actionTitle}>Export Session Data</span>
            </div>
            <div className={styles.actionDesc}>
              Export the connection table, alert log, or raw packets from any recorded session.
              Select a session from the history list to enable export.
            </div>
            <div className={styles.exportRow}>
              <Button appearance="subtle" icon={<ArrowDownload24Regular />} size="small" disabled>
                Export Connections (CSV)
              </Button>
              <Button appearance="subtle" icon={<ArrowDownload24Regular />} size="small" disabled>
                Export Connections (JSON)
              </Button>
              <Button appearance="subtle" icon={<ArrowDownload24Regular />} size="small" disabled>
                Export PCAP
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
