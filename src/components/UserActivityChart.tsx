"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ActivityPoint = {
  activity_date: string;
  active_seconds: number;
};

export default function UserActivityChart({
  data,
}: {
  data: ActivityPoint[];
}) {
  const chartData = data.map((item) => ({
    date: new Date(`${item.activity_date}T00:00:00`).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
      }
    ),
    minutes: Number((item.active_seconds / 60).toFixed(1)),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
        <div className="text-center">
          <p className="font-semibold text-white">
            No activity data yet
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Daily activity will appear after the user starts using the platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 20,
            left: 0,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
          />

          <XAxis
            dataKey="date"
            stroke="#64748b"
            tick={{
              fill: "#94a3b8",
              fontSize: 12,
            }}
            tickLine={false}
            axisLine={{
              stroke: "#334155",
            }}
          />

          <YAxis
            stroke="#64748b"
            tick={{
              fill: "#94a3b8",
              fontSize: 12,
            }}
            tickLine={false}
            axisLine={{
              stroke: "#334155",
            }}
            width={45}
            label={{
              value: "Minutes",
              angle: -90,
              position: "insideLeft",
              fill: "#64748b",
              fontSize: 12,
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#020617",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "#ffffff",
            }}
            labelStyle={{
              color: "#94a3b8",
            }}
            formatter={(value) => [
              `${value} min`,
              "Active Time",
            ]}
          />

          <Line
            type="monotone"
            dataKey="minutes"
            name="Active Time"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={{
              r: 4,
              fill: "#22d3ee",
            }}
            activeDot={{
              r: 6,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}