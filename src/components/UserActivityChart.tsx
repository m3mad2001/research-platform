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
            stroke="var(--hair)"
          />

          <XAxis
            dataKey="date"
            stroke="var(--fg-2)"
            tick={{
              fill: "var(--fg-2)",
              fontSize: 12,
            }}
            tickLine={false}
            axisLine={{
              stroke: "var(--hair)",
            }}
          />

          <YAxis
            stroke="var(--fg-2)"
            tick={{
              fill: "var(--fg-2)",
              fontSize: 12,
            }}
            tickLine={false}
            axisLine={{
              stroke: "var(--hair)",
            }}
            width={45}
            label={{
              value: "Minutes",
              angle: -90,
              position: "insideLeft",
              fill: "var(--fg-2)",
              fontSize: 12,
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "var(--fg)",
            }}
            labelStyle={{
              color: "var(--fg-2)",
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
            stroke="var(--accent)"
            strokeWidth={3}
            dot={{
              r: 4,
              fill: "var(--accent)",
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