"use client";

import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export default function AdminVisitChart({ data }: { data: Array<{
  visit_date: string;
  site_visits: number;
  registration_visits: number;
  resource_opens: number;
}> }) {
  const rows = data.map((row) => ({
    date: new Date(`${row.visit_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
    site: Number(row.site_visits), registration: Number(row.registration_visits), cards: Number(row.resource_opens),
  }));
  return <div className="mt-5 h-72 w-full" role="img" aria-label="Daily site visits, registration page visits, and card opens over 30 days">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
        <CartesianGrid stroke="#1e3852" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: "#a9bfd1", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
        <YAxis allowDecimals={false} tick={{ fill: "#a9bfd1", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#061628", border: "1px solid #27405c", borderRadius: 12 }} />
        <Legend />
        <Line name="Platform visits" dataKey="site" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
        <Line name="Registration page" dataKey="registration" stroke="#fbbf24" strokeWidth={2.5} dot={false} />
        <Line name="Card opens" dataKey="cards" stroke="#34d399" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
