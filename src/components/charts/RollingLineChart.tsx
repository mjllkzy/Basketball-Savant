"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RollingLineChart({ data, lines = ["pts"] }: { data: Array<Record<string, string | number>>; lines?: string[] }) {
  return (
    <div className="h-72 rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-black text-ink">Rolling Trend</h3>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {lines.map((line, index) => (
            <Line key={line} dataKey={line} type="monotone" stroke={index === 0 ? "#0f766e" : index === 1 ? "#d97706" : "#1d4ed8"} strokeWidth={2.5} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
