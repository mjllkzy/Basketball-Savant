"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GameFlowChart({ data }: { data: Array<{ index: number; label: string; margin: number }> }) {
  return (
    <div className="h-72 rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-black text-ink">Gameflow Runs</h3>
      <ResponsiveContainer width="100%" height="88%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="index" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""} />
          <Area dataKey="margin" stroke="#0f766e" fill="#0f766e" fillOpacity={0.22} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
