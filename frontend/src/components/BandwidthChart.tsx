import { useMemo } from "react";
import { tokens } from "@fluentui/react-components";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTrafficStore } from "../store/traffic";

export const BandwidthChart = () => {
  const snapshotHistory = useTrafficStore((state) => state.snapshotHistory);

  const chartData = useMemo(() => {
    return snapshotHistory.map((snap, idx) => ({
      time: idx,
      bytesIn: snap.BytesIn,
      bytesOut: snap.BytesOut,
    }));
  }, [snapshotHistory]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), 2);
    return `${(bytes / Math.pow(k, i)).toFixed(1)}${sizes[i]}`;
  };

  if (chartData.length === 0) {
    return (
      <div
        style={{
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tokens.colorNeutralForeground3,
          fontSize: tokens.fontSizeBase200,
        }}
      >
        Start a capture to see bandwidth over time
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={tokens.colorNeutralStroke2}
        />
        <XAxis
          dataKey="time"
          stroke={tokens.colorNeutralForeground3}
          tick={{ fill: tokens.colorNeutralForeground3, fontSize: 11 }}
          label={{
            value: "Seconds ago",
            position: "insideBottom",
            offset: -5,
            fill: tokens.colorNeutralForeground3,
            fontSize: 11,
          }}
        />
        <YAxis
          stroke={tokens.colorNeutralForeground3}
          tick={{ fill: tokens.colorNeutralForeground3, fontSize: 11 }}
          tickFormatter={formatBytes}
          label={{
            value: "Bytes/s",
            angle: -90,
            position: "insideLeft",
            fill: tokens.colorNeutralForeground3,
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tokens.colorNeutralBackground1,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
            borderRadius: tokens.borderRadiusMedium,
            fontSize: tokens.fontSizeBase200,
          }}
          formatter={(value) => (typeof value === "number" ? formatBytes(value) : value)}
        />
        <Legend
          wrapperStyle={{
            fontSize: tokens.fontSizeBase200,
            color: tokens.colorNeutralForeground2,
          }}
        />
        <Line
          type="monotone"
          dataKey="bytesIn"
          stroke={tokens.colorPaletteBlueForeground2}
          strokeWidth={2}
          dot={false}
          name="Inbound"
        />
        <Line
          type="monotone"
          dataKey="bytesOut"
          stroke={tokens.colorPaletteGreenForeground2}
          strokeWidth={2}
          dot={false}
          name="Outbound"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
