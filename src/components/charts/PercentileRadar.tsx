"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export function PercentileRadar({ data }: { data: Array<{ metric: string; percentile: number }> }) {
  return (
    <div className="h-80 rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-black text-ink">Percentile Radar</h3>
      <ResponsiveContainer width="100%" height="88%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#dbe3ee" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Radar dataKey="percentile" stroke="#0f766e" fill="#0f766e" fillOpacity={0.26} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
