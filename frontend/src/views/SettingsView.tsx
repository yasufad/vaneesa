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
} from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
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
    padding: tokens.spacingVerticalM,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: tokens.spacingHorizontalL,
    height: "100%",
    boxSizing: "border-box",
  },
  settingHeader: {
    marginBottom: tokens.spacingVerticalM,
  },
  settingControl: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    marginTop: "auto",
    paddingTop: tokens.spacingVerticalM,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalS,
  },
});

export const SettingsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Settings</Title2>

      <div className={styles.section}>
        <Subtitle1>Capture Settings</Subtitle1>
        <div className={styles.grid}>
          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Default Interface</Label>
              <p className={styles.description}>
                Choose the network interface Vaneesa will monitor for live
                traffic.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Dropdown
                placeholder="Select an interface"
                style={{ width: "100%" }}
              >
                <Option>eth0 (192.168.1.15)</Option>
                <Option>wlan0 (192.168.1.16)</Option>
                <Option>lo0 (127.0.0.1)</Option>
              </Dropdown>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Promiscuous Mode</Label>
              <p className={styles.description}>
                Allow the interface to capture all traffic on the network
                segment, not just traffic addressed to this machine.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Switch label={<span>Enable</span>} />
            </div>
          </Card>
        </div>
      </div>

      <div className={styles.section}>
        <Subtitle1>Detector Thresholds</Subtitle1>
        <div className={styles.grid}>
          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Rate Spike Sensitivity</Label>
              <p className={styles.description}>
                Alert when a source IP's traffic exceeds this multiple of its
                60-second rolling average.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Slider defaultValue={5} min={2} max={20} style={{ flex: 1 }} />
              <span>5x</span>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">Port Scan Threshold</Label>
              <p className={styles.description}>
                Number of distinct destination ports contacted within 10 seconds
                to trigger an alert.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Slider defaultValue={20} min={5} max={100} style={{ flex: 1 }} />
              <span>20</span>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.settingHeader}>
              <Label weight="semibold">SYN Flood Ratio</Label>
              <p className={styles.description}>
                Alert when the ratio of SYN packets to SYN-ACK packets exceeds
                this threshold.
              </p>
            </div>
            <div className={styles.settingControl}>
              <Slider defaultValue={10} min={2} max={50} style={{ flex: 1 }} />
              <span>10:1</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
