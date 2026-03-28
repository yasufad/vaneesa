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

export const HostsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Hosts</Title2>
      <Subtitle1>Discovered network devices</Subtitle1>
      <div style={{ color: tokens.colorNeutralForeground3 }}>
        A list of identified devices on the network will appear here.
      </div>
    </div>
  );
};
