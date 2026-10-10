"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function PillDot(props: any) {
  const { cx, cy, value } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <rect x={cx - 16} y={cy - 30} width={32} height={20} rx={10} fill="#0e1d6b" />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize={10} fontWeight={600} fill="#fde021">
        {value}
      </text>
      <circle cx={cx} cy={cy} r={4} fill="#0033c6" stroke="#fff" strokeWidth={2} />
    </g>
  );
}

export function GrowthChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 36, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e8ecf8" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#4a5591", fontSize: 12 }}
            axisLine={{ stroke: "#c3cbef" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: "#c3cbef", fontSize: 13 }}
            labelStyle={{ color: "#10173d", fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#0033c6"
            strokeWidth={2.5}
            dot={<PillDot />}
            activeDot={{ r: 6, fill: "#fde021", stroke: "#0033c6", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
