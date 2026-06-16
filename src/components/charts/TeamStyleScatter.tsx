"use client";

import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

export function TeamStyleScatter({ data }: { data: Array<{ name: string; pace: number; shotQuality: number; net: number }> }) {
  return (
    <div className="h-80 rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-black text-ink">Team Style Map</h3>
      <ResponsiveContainer width="100%" height="88%">
        <ScatterChart>
          <XAxis dataKey="pace" name="Pace" tick={{ fontSize: 11 }} />
          <YAxis dataKey="shotQuality" name="Shot Quality" tick={{ fontSize: 11 }} />
          <ZAxis dataKey="net" range={[60, 180]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#0f766e" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
