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

export const DashboardView = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>Dashboard</Title2>
      <Subtitle1>Live network traffic overview</Subtitle1>
      <div style={{ color: tokens.colorNeutralForeground3 }}>
        Charts and top-talker metrics will be displayed here soon.
      </div>
    </div>
  );
};
