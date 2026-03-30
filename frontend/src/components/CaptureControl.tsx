import { useEffect, useState } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Dropdown,
  Option,
  Input,
  Switch,
  Label,
  Card,
  Spinner,
} from "@fluentui/react-components";
import {
  Play24Regular,
  Stop24Regular,
  ArrowSync24Regular,
} from "@fluentui/react-icons";
import { useCaptureStore } from "../store/capture";
import { CaptureState } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  card: {
    padding: tokens.spacingHorizontalL,
  },
  row: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    alignItems: "flex-end",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    flex: 1,
  },
  switchField: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
  },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
});

export const CaptureControl = () => {
  const styles = useStyles();
  const {
    status,
    interfaces,
    isLoadingInterfaces,
    loadInterfaces,
    startCapture,
    stopCapture,
  } = useCaptureStore();

  const [sessionName, setSessionName] = useState("");
  const [selectedInterface, setSelectedInterface] = useState("");
  const [filter, setFilter] = useState("");
  const [promiscuous, setPromiscuous] = useState(false);

  useEffect(() => {
    loadInterfaces();
  }, [loadInterfaces]);

  const isIdle = status.State === CaptureState.StateIdle;
  const isRunning = status.State === CaptureState.StateRunning;
  const isTransitioning =
    status.State === CaptureState.StateStarting ||
    status.State === CaptureState.StateStopping;

  const handleStart = async () => {
    if (!sessionName.trim() || !selectedInterface) return;
    await startCapture(sessionName.trim(), selectedInterface, filter, promiscuous);
  };

  const handleStop = async () => {
    await stopCapture();
  };

  const getStatusColor = () => {
    switch (status.State) {
      case CaptureState.StateRunning:
        return tokens.colorPaletteGreenForeground1;
      case CaptureState.StateStarting:
      case CaptureState.StateStopping:
        return tokens.colorPaletteYellowForeground1;
      case CaptureState.StateError:
        return tokens.colorPaletteRedForeground1;
      default:
        return tokens.colorNeutralForeground4;
    }
  };

  const getStatusText = () => {
    switch (status.State) {
      case CaptureState.StateIdle:
        return "Idle";
      case CaptureState.StateStarting:
        return "Starting…";
      case CaptureState.StateRunning:
        return `Capturing on ${status.Interface}`;
      case CaptureState.StateStopping:
        return "Stopping…";
      case CaptureState.StateError:
        return `Error: ${status.ErrorMessage}`;
      default:
        return "Unknown";
    }
  };

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.row}>
          <div className={styles.field}>
            <Label htmlFor="session-name" weight="semibold">
              Session Name
            </Label>
            <Input
              id="session-name"
              placeholder="e.g. Office Network Baseline"
              value={sessionName}
              onChange={(_, data) => setSessionName(data.value)}
              disabled={!isIdle}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="interface-select" weight="semibold">
              Interface
            </Label>
            <Dropdown
              id="interface-select"
              placeholder={
                isLoadingInterfaces ? "Loading…" : "Select interface"
              }
              value={selectedInterface}
              onOptionSelect={(_, data) =>
                setSelectedInterface(data.optionValue ?? "")
              }
              disabled={!isIdle || isLoadingInterfaces}
            >
              {interfaces.map((iface) => (
                <Option
                  key={iface.Name}
                  value={iface.Name}
                  text={
                    iface.Name +
                    (iface.Description ? ` — ${iface.Description}` : "")
                  }
                >
                  {iface.Name}
                  {iface.Description && ` — ${iface.Description}`}
                </Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.field}>
            <Label htmlFor="filter-input" weight="semibold">
              BPF Filter (optional)
            </Label>
            <Input
              id="filter-input"
              placeholder="e.g. not port 22"
              value={filter}
              onChange={(_, data) => setFilter(data.value)}
              disabled={!isIdle}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.switchField}>
            <Switch
              checked={promiscuous}
              onChange={(_, data) => setPromiscuous(data.checked)}
              disabled={!isIdle}
            />
            <Label>Promiscuous Mode</Label>
          </div>

          <div style={{ flex: 1 }} />

          <div className={styles.actions}>
            <div className={styles.statusIndicator}>
              <div
                className={styles.statusDot}
                style={{ backgroundColor: getStatusColor() }}
              />
              <span>{getStatusText()}</span>
            </div>

            {isLoadingInterfaces && <Spinner size="tiny" />}

            {isTransitioning && <Spinner size="tiny" />}

            {isIdle && (
              <>
                <Button
                  icon={<ArrowSync24Regular />}
                  appearance="subtle"
                  size="small"
                  onClick={loadInterfaces}
                  disabled={isLoadingInterfaces}
                >
                  Refresh
                </Button>
                <Button
                  icon={<Play24Regular />}
                  appearance="primary"
                  size="medium"
                  onClick={handleStart}
                  disabled={!sessionName.trim() || !selectedInterface}
                >
                  Start Capture
                </Button>
              </>
            )}

            {isRunning && (
              <Button
                icon={<Stop24Regular />}
                appearance="primary"
                size="medium"
                onClick={handleStop}
              >
                Stop Capture
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
