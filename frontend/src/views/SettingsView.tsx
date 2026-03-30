import { useEffect } from "react";
import {
  makeStyles,
  tokens,
  Title2,
  Subtitle1,
  Card,
  Dropdown,
  Option,
  Switch,
  Label,
  Slider,
  Button,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
} from "@fluentui/react-components";
import { Save24Regular, ArrowReset24Regular } from "@fluentui/react-icons";
import { useSettingsStore } from "../store/settings";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
    overflowY: "auto",
    paddingBottom: tokens.spacingVerticalXXL,
  },
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: tokens.spacingHorizontalL,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    padding: tokens.spacingHorizontalL,
    gap: tokens.spacingVerticalM,
  },
  settingHeader: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    lineHeight: "1.5",
  },
  settingControl: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  sliderValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    minWidth: "40px",
    textAlign: "right" as const,
  },
  loadingOverlay: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    padding: tokens.spacingVerticalM,
  },
});

// Placeholder interface options — replaced in Phase 4 when CaptureService.GetInterfaces() is wired.
const INTERFACE_PLACEHOLDERS = ["eth0", "wlan0", "lo0"];

export const SettingsView = () => {
  const styles = useStyles();

  const {
    settings,
    thresholds,
    isLoading,
    isDirty,
    error,
    loadAll,
    updateSettings,
    updateThresholds,
    saveSettings,
    saveThresholds,
  } = useSettingsStore();

  // Load persisted values from the backend once on mount. The store falls back
  // gracefully to defaults when bindings are not yet generated.
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveAll = async () => {
    await saveSettings();
    await saveThresholds();
  };

  const handleReset = () => {
    // Re-load from the database, discarding any unsaved local changes.
    loadAll();
  };

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <Title2>Settings</Title2>
        <div className={styles.headerActions}>
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <Spinner size="tiny" />
              <span>Loading…</span>
            </div>
          )}
          <Button
            icon={<ArrowReset24Regular />}
            appearance="subtle"
            size="small"
            onClick={handleReset}
            disabled={isLoading || !isDirty}
          >
            Discard changes
          </Button>
          <Button
            icon={<Save24Regular />}
            appearance="primary"
            size="small"
            onClick={handleSaveAll}
            disabled={isLoading || !isDirty}
          >
            Save
          </Button>
        </div>
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {/* Capture Settings */}
      <div className={styles.section}>
        <Subtitle1>Capture Settings</Subtitle1>
        <div className={styles.grid}>
          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold" htmlFor="setting-interface">
                Default Interface
              </Label>
              <p className={styles.description}>
                Choose the network interface Vaneesa will monitor for live
                traffic. Available interfaces are populated by the capture
                subsystem.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Dropdown
                id="setting-interface"
                placeholder="Select an interface"
                style={{ flex: 1 }}
                value={settings.defaultInterface || undefined}
                onOptionSelect={(_, data) =>
                  updateSettings({ defaultInterface: data.optionValue ?? "" })
                }
              >
                {INTERFACE_PLACEHOLDERS.map((iface) => (
                  <Option key={iface} value={iface}>
                    {iface}
                  </Option>
                ))}
              </Dropdown>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Promiscuous Mode</Label>
              <p className={styles.description}>
                Capture all traffic on the network segment, not only traffic
                addressed to this machine. Requires elevated privileges.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Switch
                checked={settings.promiscuousMode}
                onChange={(_, data) =>
                  updateSettings({ promiscuousMode: data.checked })
                }
                label={
                  <span>
                    {settings.promiscuousMode ? "Enabled" : "Disabled"}
                  </span>
                }
              />
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold" htmlFor="setting-bpf">
                BPF Filter
              </Label>
              <p className={styles.description}>
                Optional Berkeley Packet Filter expression applied at the
                capture handle. Leave empty to capture all traffic. Example:{" "}
                <code>not port 22</code>.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Input
                id="setting-bpf"
                placeholder="e.g. not port 22 and not arp"
                style={{ flex: 1 }}
                value={settings.bpfFilter}
                onChange={(_, data) =>
                  updateSettings({ bpfFilter: data.value })
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Detector Thresholds */}
      <div className={styles.section}>
        <Subtitle1>Detector Thresholds</Subtitle1>
        <div className={styles.grid}>
          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Rate Spike Sensitivity</Label>
              <p className={styles.description}>
                Alert when a source IP's packet rate exceeds this multiple of
                its 60-second rolling average. Lower values are more sensitive.
                Requires a baseline of at least {thresholds.rateSpikeMinimumPPS}{" "}
                pps to activate.
              </p>
            </div>
            <div className={styles.sliderRow}>
              <Slider
                style={{ flex: 1 }}
                min={2}
                max={20}
                step={1}
                value={thresholds.rateSpikeMultiplier}
                onChange={(_, data) =>
                  updateThresholds({ rateSpikeMultiplier: data.value })
                }
              />
              <span className={styles.sliderValue}>
                {thresholds.rateSpikeMultiplier}×
              </span>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Rate Spike Minimum Baseline</Label>
              <p className={styles.description}>
                Minimum packets per second a source must sustain (as a 60-second
                average) before rate-spike detection activates. Prevents false
                positives on idle interfaces.
              </p>
            </div>
            <div className={styles.sliderRow}>
              <Slider
                style={{ flex: 1 }}
                min={1}
                max={100}
                step={1}
                value={thresholds.rateSpikeMinimumPPS}
                onChange={(_, data) =>
                  updateThresholds({ rateSpikeMinimumPPS: data.value })
                }
              />
              <span className={styles.sliderValue}>
                {thresholds.rateSpikeMinimumPPS} pps
              </span>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Port Scan Threshold</Label>
              <p className={styles.description}>
                Number of distinct destination ports a single source must
                contact within 10 seconds to trigger a PortScan alert. Lower
                values surface slower, stealthier scans at the cost of more
                false positives.
              </p>
            </div>
            <div className={styles.sliderRow}>
              <Slider
                style={{ flex: 1 }}
                min={5}
                max={100}
                step={1}
                value={thresholds.portScanThreshold}
                onChange={(_, data) =>
                  updateThresholds({ portScanThreshold: data.value })
                }
              />
              <span className={styles.sliderValue}>
                {thresholds.portScanThreshold} ports
              </span>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">SYN Flood Ratio</Label>
              <p className={styles.description}>
                SYN-to-SYN-ACK ratio above which a SynFlood alert fires. A ratio
                of 10 means 10 SYN packets for every 1 SYN-ACK, indicating most
                connections are not completing the handshake.
              </p>
            </div>
            <div className={styles.sliderRow}>
              <Slider
                style={{ flex: 1 }}
                min={2}
                max={50}
                step={1}
                value={thresholds.synFloodRatio}
                onChange={(_, data) =>
                  updateThresholds({ synFloodRatio: data.value })
                }
              />
              <span className={styles.sliderValue}>
                {thresholds.synFloodRatio}:1
              </span>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">SYN Flood Minimum SYNs</Label>
              <p className={styles.description}>
                Minimum SYN packets per second required before flood detection
                activates. Prevents alerts on low-volume traffic where a skewed
                ratio is statistically normal.
              </p>
            </div>
            <div className={styles.sliderRow}>
              <Slider
                style={{ flex: 1 }}
                min={10}
                max={500}
                step={10}
                value={thresholds.synFloodMinimumSYNs}
                onChange={(_, data) =>
                  updateThresholds({ synFloodMinimumSYNs: data.value })
                }
              />
              <span className={styles.sliderValue}>
                {thresholds.synFloodMinimumSYNs} SYNs
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
