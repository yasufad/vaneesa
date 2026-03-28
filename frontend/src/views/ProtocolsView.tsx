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

export const ProtocolsView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Protocols</Title2>
      <Subtitle1>Network activity distribution</Subtitle1>
      <div style={{ color: tokens.colorNeutralForeground3 }}>
        Breakdowns of traffic by protocol will be displayed here soon.
      </div>
    </div>
  );
};
