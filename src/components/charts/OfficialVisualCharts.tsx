"use client";

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

export type TeamStylePoint = {
  team: string;
  name: string;
  pace: number;
  efgPct: number;
  netRating: number;
  offensiveRating: number;
  defensiveRating: number;
};

export type PlayerTrendPoint = {
  date: string;
  pts: number;
  tsPct: number;
  usagePct: number;
  net: number;
};

export type LeaderPoint = {
  player: string;
  team: string;
  ppg: number;
  tsPct: number;
};

function netColor(value: number) {
  if (value >= 5) return "#0f766e";
  if (value >= 0) return "#2563eb";
  if (value >= -5) return "#d97706";
  return "#b91c1c";
}

export function TeamStyleMatrix({ data }: { data: TeamStylePoint[] }) {
  return (
    <div className="h-[30rem] rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink">Team Style Matrix</h2>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Pace x eFG%</span>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="pace" name="Pace" type="number" domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11 }} />
          <YAxis dataKey="efgPct" name="eFG%" type="number" domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} />
          <ZAxis dataKey="netRating" name="Net Rating" range={[90, 220]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Teams" data={data}>
            {data.map((team) => <Cell key={team.team} fill={netColor(team.netRating)} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlayerGameTrendChart({ data, playerName }: { data: PlayerTrendPoint[]; playerName: string }) {
  return (
    <div className="h-[28rem] rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink">Player Trend</h2>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{playerName}</span>
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height="88%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 18, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="points" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="rates" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="points" dataKey="pts" name="PTS" fill="#0f766e" radius={[4, 4, 0, 0]} />
            <Line yAxisId="rates" dataKey="tsPct" name="TS%" type="monotone" stroke="#2563eb" strokeWidth={2.5} dot={false} />
            <Line yAxisId="rates" dataKey="usagePct" name="USG%" type="monotone" stroke="#d97706" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[88%] items-center justify-center rounded border border-dashed border-slate-200 px-6 text-center text-sm leading-6 text-slate-500">
          Official player game logs are unavailable for this player.
        </div>
      )}
    </div>
  );
}

export function ScoringLeadersChart({ data }: { data: LeaderPoint[] }) {
  return (
    <div className="h-[34rem] rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink">Scoring Leaders</h2>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">PTS / game</span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 12, left: 92 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey="player" type="category" width={112} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="ppg" name="PPG" radius={[0, 5, 5, 0]}>
            {data.map((row, index) => <Cell key={`${row.player}-${row.team}`} fill={index < 4 ? "#0f766e" : index < 8 ? "#2563eb" : "#d97706"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
