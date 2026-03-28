import {
  makeStyles,
  tokens,
  Title2,
  Subtitle1,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
});

export const AlertsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Alerts</Title2>
      <Subtitle1>Anomaly detection events</Subtitle1>
      <div style={{ color: tokens.colorNeutralForeground3 }}>
        Recent alerts for traffic spikes and port scans will appear here.
      </div>
    </div>
  );
};
