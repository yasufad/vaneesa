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

export const ConnectionsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Connections</Title2>
      <Subtitle1>Live network flow monitoring</Subtitle1>
      <div style={{ color: tokens.colorNeutralForeground3 }}>
        A virtualised table containing active TCP/UDP flows will be displayed
        here soon.
      </div>
    </div>
  );
};
