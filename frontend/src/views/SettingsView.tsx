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
  Divider,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXL,
    maxWidth: "800px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  settingRow: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  settingControl: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  card: {
    padding: tokens.spacingHorizontalL,
  },
});

export const SettingsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Settings</Title2>

      <div className={styles.section}>
        <Subtitle1>Capture Settings</Subtitle1>
        <Card className={styles.card}>
          <div className={styles.settingRow}>
            <Label>Default Interface</Label>
            <Dropdown placeholder="Select an interface">
              <Option>eth0 (192.168.1.15)</Option>
              <Option>wlan0 (192.168.1.16)</Option>
              <Option>lo0 (127.0.0.1)</Option>
            </Dropdown>
            <p
              style={{
                color: tokens.colorNeutralForeground3,
                fontSize: tokens.fontSizeBase200,
              }}
            >
              Choose the network interface Vaneesa will monitor for live
              traffic.
            </p>
          </div>

          <Divider />

          <div className={styles.settingRow}>
            <div className={styles.settingControl}>
              <Switch label="Promiscuous Mode" />
            </div>
            <p
              style={{
                color: tokens.colorNeutralForeground3,
                fontSize: tokens.fontSizeBase200,
              }}
            >
              Allow the interface to capture all traffic on the network segment,
              not just traffic addressed to this machine.
            </p>
          </div>
        </Card>
      </div>

      <div className={styles.section}>
        <Subtitle1>Detector Thresholds</Subtitle1>
        <Card className={styles.card}>
          <div className={styles.settingRow}>
            <Label>Rate Spike Sensitivity (×60s average)</Label>
            <div className={styles.settingControl}>
              <Slider defaultValue={5} min={2} max={20} />
              <span>5x</span>
            </div>
            <p
              style={{
                color: tokens.colorNeutralForeground3,
                fontSize: tokens.fontSizeBase200,
              }}
            >
              Alert when a source IP's traffic exceeds this multiple of its
              60-second rolling average.
            </p>
          </div>

          <Divider />

          <div className={styles.settingRow}>
            <Label>Port Scan Threshold (distinct ports)</Label>
            <div className={styles.settingControl}>
              <Slider defaultValue={20} min={5} max={100} />
              <span>20</span>
            </div>
            <p
              style={{
                color: tokens.colorNeutralForeground3,
                fontSize: tokens.fontSizeBase200,
              }}
            >
              The number of distinct destination ports a source must contact
              within 10 seconds to trigger an alert.
            </p>
          </div>

          <Divider />

          <div className={styles.settingRow}>
            <Label>SYN Flood Ratio (SYN:SYN-ACK)</Label>
            <div className={styles.settingControl}>
              <Slider defaultValue={10} min={2} max={50} />
              <span>10:1</span>
            </div>
            <p
              style={{
                color: tokens.colorNeutralForeground3,
                fontSize: tokens.fontSizeBase200,
              }}
            >
              Alert when the ratio of SYN packets to SYN-ACK packets exceeds
              this threshold.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
