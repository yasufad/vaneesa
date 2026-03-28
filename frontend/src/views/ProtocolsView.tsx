import {
  makeStyles,
  tokens,
  Title2,
  Card,
  Button,
} from "@fluentui/react-components";
import { ProtocolHandler24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    height: "100%",
    overflow: "hidden",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
  timeRangeGroup: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  chartCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    flexShrink: 0,
  },
  chartTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  chartArea: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    height: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    textAlign: "center" as const,
    padding: tokens.spacingHorizontalL,
    lineHeight: "1.6",
    gap: tokens.spacingVerticalS,
  },
  breakdownCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
  },
  breakdownTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  breakdownList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    overflow: "auto",
    flex: 1,
  },
  protocolRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  protocolName: {
    width: "56px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: "8px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: tokens.borderRadiusCircular,
    opacity: 0.25,
  },
  protocolPct: {
    width: "44px",
    textAlign: "right" as const,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "56px 1fr 44px 80px 80px",
    gap: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  detailRow: {
    display: "grid",
    gridTemplateColumns: "56px 1fr 44px 80px 80px",
    gap: tokens.spacingHorizontalM,
    alignItems: "center",
  },
  skeletonBar: {
    height: "11px",
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
  },
});

const PROTOCOLS = [
  { name: "TCP",  colour: tokens.colorPaletteGreenBackground2,  barPct: "68%",  displayPct: "—" },
  { name: "UDP",  colour: tokens.colorPaletteBlueForeground2,   barPct: "21%",  displayPct: "—" },
  { name: "DNS",  colour: tokens.colorPalettePurpleBackground2, barPct: "7%",   displayPct: "—" },
  { name: "ARP",  colour: tokens.colorPaletteYellowBackground2, barPct: "2%",   displayPct: "—" },
  { name: "ICMP", colour: tokens.colorPaletteRedBackground2,    barPct: "1%",   displayPct: "—" },
  { name: "Other",colour: tokens.colorNeutralBackground5,       barPct: "1%",   displayPct: "—" },
];

const DETAIL_ROWS = [
  ["72%", "65%", "80%"],
  ["58%", "70%", "60%"],
  ["88%", "55%", "75%"],
  ["64%", "80%", "65%"],
  ["78%", "60%", "70%"],
  ["50%", "72%", "55%"],
];

const TIME_RANGES = ["1 min", "2 min", "5 min", "10 min"] as const;

export const ProtocolsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <Title2>Protocols</Title2>
          <div className={styles.subtitle}>
            Network activity distribution over time — start a capture session to populate this view.
          </div>
        </div>
        <div className={styles.timeRangeGroup}>
          {TIME_RANGES.map((range, i) => (
            <Button
              key={range}
              size="small"
              appearance={i === 1 ? "primary" : "subtle"}
              disabled
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      <Card className={styles.chartCard}>
        <span className={styles.chartTitle}>Protocol Distribution — Last 2 Minutes</span>
        <div className={styles.chartArea}>
          <ProtocolHandler24Regular style={{ fontSize: "28px", opacity: 0.3 }} />
          <span>
            Stacked time-series chart will render here.<br />
            <span style={{ opacity: 0.7 }}>Protocol byte-counts at 1-second resolution.</span>
          </span>
        </div>
      </Card>

      <Card className={styles.breakdownCard}>
        <span className={styles.breakdownTitle}>Protocol Breakdown</span>

        <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL, flexShrink: 0 }}>
          {PROTOCOLS.map(({ name, colour, barPct, displayPct }) => (
            <div key={name} className={styles.protocolRow}>
              <span className={styles.protocolName}>{name}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: barPct, backgroundColor: colour }}
                />
              </div>
              <span className={styles.protocolPct}>{displayPct}</span>
            </div>
          ))}
        </div>

        <div style={{ height: "1px", backgroundColor: tokens.colorNeutralStroke2, marginTop: tokens.spacingVerticalS }} />

        <div className={styles.colHeaders}>
          <span>Protocol</span>
          <span>Proportion</span>
          <span>%</span>
          <span>Bytes</span>
          <span>Packets</span>
        </div>

        <div className={styles.breakdownList}>
          {DETAIL_ROWS.map((widths, i) => (
            <div key={i} className={styles.detailRow}>
              <div className={styles.skeletonBar} style={{ width: "70%" }} />
              <div className={styles.skeletonBar} style={{ width: "100%" }} />
              <div className={styles.skeletonBar} style={{ width: widths[0] }} />
              <div className={styles.skeletonBar} style={{ width: widths[1] }} />
              <div className={styles.skeletonBar} style={{ width: widths[2] }} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
