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

export const SessionsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Sessions</Title2>
      <Subtitle1>Capture history and PCAP replay</Subtitle1>
      <div style={{ color: tokens.colorNeutralForeground3 }}>
        Saved sessions and PCAP file management will be available here.
      </div>
    </div>
  );
};
