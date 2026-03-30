import { useMemo } from "react";
import { tokens } from "@fluentui/react-components";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTrafficStore } from "../store/traffic";
import { Protocol } from "../../bindings/github.com/yasufad/vaneesa/internal/types/models";

const PROTOCOL_COLORS: Record<number, string> = {
  [Protocol.ProtoTCP]: tokens.colorPaletteBlueForeground2,
  [Protocol.ProtoUDP]: tokens.colorPaletteGreenForeground2,
  [Protocol.ProtoICMP]: tokens.colorPaletteYellowForeground2,
  [Protocol.ProtoICMPv6]: tokens.colorPaletteDarkOrangeForeground2,
  [Protocol.ProtoARP]: tokens.colorPalettePurpleForeground2,
  [Protocol.ProtoOther]: tokens.colorNeutralForeground3,
};

const PROTOCOL_NAMES: Record<number, string> = {
  [Protocol.ProtoTCP]: "TCP",
  [Protocol.ProtoUDP]: "UDP",
  [Protocol.ProtoICMP]: "ICMP",
  [Protocol.ProtoICMPv6]: "ICMPv6",
  [Protocol.ProtoARP]: "ARP",
  [Protocol.ProtoOther]: "Other",
};

export const ProtocolChart = () => {
  const currentSnapshot = useTrafficStore((state) => state.currentSnapshot);

  const chartData = useMemo(() => {
    if (!currentSnapshot || currentSnapshot.ProtocolStats.length === 0) {
      return [];
    }

    return currentSnapshot.ProtocolStats.map((stat) => ({
      name: PROTOCOL_NAMES[stat.Protocol] || "Unknown",
      value: stat.Bytes,
      packets: stat.Packets,
      protocol: stat.Protocol,
    })).filter((item) => item.value > 0);
  }, [currentSnapshot]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), 3);
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
        Start a capture to see protocol distribution
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={PROTOCOL_COLORS[entry.protocol] || tokens.colorNeutralForeground3}
            />
          ))}
        </Pie>
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
            fontSize: tokens.fontSizeBase100,
            color: tokens.colorNeutralForeground2,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
