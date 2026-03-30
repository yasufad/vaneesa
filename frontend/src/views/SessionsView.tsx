import { useEffect, useState } from "react";
import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Button,
  Divider,
} from "@fluentui/react-components";
import {
  History24Regular,
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  Record24Regular,
} from "@fluentui/react-icons";
import * as SessionService from "../../bindings/github.com/yasufad/vaneesa/sessionservice";
import { SessionSummary } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

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

export const SessionsView = () => {
  const styles = useStyles();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const result = await SessionService.ListSessions();
        setSessions(result || []);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (started: string, ended: string | null): string => {
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  };

  const handleExportCSV = async () => {
    if (!selectedSession) return;
    try {
      const csv = await SessionService.ExportFlowsCSV(selectedSession.ID);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedSession.Name}-flows.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  };

  const handleExportJSON = async () => {
    if (!selectedSession) return;
    try {
      const json = await SessionService.ExportFlowsJSON(selectedSession.ID);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedSession.Name}-flows.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON:", err);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Sessions</Title2>
        <div className={styles.subtitle}>
          Manage capture sessions, import PCAP files for replay, and export
          collected data.
        </div>
      </div>

      <div className={styles.splitPane}>
        {/* Left: session history */}
        <Card className={styles.listCard}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Session History</span>
            <History24Regular
              style={{
                fontSize: "16px",
                color: tokens.colorNeutralForeground3,
              }}
            />
          </div>

          <Divider />

          <div className={styles.sessionList}>
            {sessions.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  gap: tokens.spacingVerticalS,
                  color: tokens.colorNeutralForeground3,
                  padding: tokens.spacingHorizontalL,
                  textAlign: "center",
                }}
              >
                <History24Regular style={{ fontSize: "28px", opacity: 0.3 }} />
                <span style={{ fontSize: tokens.fontSizeBase200 }}>
                  Past sessions will appear here.
                  <br />
                  Start a capture to record your first session.
                </span>
              </div>
            )}

            {sessions.map((session) => {
              const isActive = !session.EndedAt;
              return (
                <div
                  key={session.ID}
                  className={styles.sessionItem}
                  onClick={() => setSelectedSession(session)}
                  style={{
                    backgroundColor: selectedSession?.ID === session.ID ? tokens.colorNeutralBackground2 : undefined,
                    cursor: "pointer",
                  }}
                >
                  <div
                    className={styles.statusDot}
                    style={{
                      backgroundColor: isActive
                        ? tokens.colorPaletteGreenForeground1
                        : tokens.colorNeutralBackground5,
                    }}
                  />
                  <div className={styles.sessionMeta}>
                    <div style={{ fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold }}>
                      {session.Name}
                    </div>
                    <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                      {new Date(session.StartedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={styles.sessionDuration}>
                    {formatDuration(session.StartedAt, session.EndedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className={styles.actionsPane}>
          <Card className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIconWrap}>
                <Record24Regular style={{ fontSize: "20px" }} />
              </div>
              <span className={styles.actionTitle}>New Live Session</span>
            </div>
            <div className={styles.actionDesc}>
              Use the Dashboard to start a new live capture session. Navigate to Dashboard
              and use the Capture Control panel to select an interface and begin monitoring.
            </div>
          </Card>

          <Card className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIconWrap}>
                <ArrowUpload24Regular style={{ fontSize: "20px" }} />
              </div>
              <span className={styles.actionTitle}>Import PCAP File</span>
            </div>
            <div className={styles.actionDesc}>
              PCAP replay functionality will be available in Phase 6. This will allow you to
              open .pcap files captured elsewhere and replay them through the analysis pipeline.
            </div>
          </Card>

          <Card className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <div className={styles.actionIconWrap}>
                <ArrowDownload24Regular style={{ fontSize: "20px" }} />
              </div>
              <span className={styles.actionTitle}>Export Session Data</span>
            </div>
            <div className={styles.actionDesc}>
              {selectedSession
                ? `Export connection data from "${selectedSession.Name}"`
                : "Select a session from the history list to enable export."}
            </div>
            <div className={styles.exportRow}>
              <Button
                appearance="subtle"
                icon={<ArrowDownload24Regular />}
                size="small"
                disabled={!selectedSession}
                onClick={handleExportCSV}
              >
                Export Connections (CSV)
              </Button>
              <Button
                appearance="subtle"
                icon={<ArrowDownload24Regular />}
                size="small"
                disabled={!selectedSession}
                onClick={handleExportJSON}
              >
                Export Connections (JSON)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
