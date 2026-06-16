"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { BasketballCourt, courtPoint } from "@/components/charts/BasketballCourt";

export type ShotSearchRow = {
  id: string;
  date: string;
  game: string;
  quarter: string;
  clock: string;
  player: string;
  team: string;
  opponent: string;
  playType: string;
  shotZone: string;
  shotType: string;
  defender: string;
  defenderDistance: string;
  dribbles: number;
  touchTime: string;
  shotClock: number;
  xfg: string;
  xpts: string;
  result: string;
  points: number;
  ame: string;
  x: number;
  y: number;
  made: boolean;
  possessionId: string;
};

export function ShotSearchResults({ rows }: { rows: ShotSearchRow[] }) {
  const [selected, setSelected] = useState<ShotSearchRow | null>(null);
  return (
    <>
      <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1320px] border-collapse text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              {["Date", "Game", "Q", "Clock", "Player", "Team", "Opp", "Play Type", "Zone", "Type", "Defender", "Def Dist", "Drib", "Touch", "Clock", "xFG%", "xPTS", "Result", "PTS", "A-xE"].map((heading) => (
                <th key={heading} className="border-b border-slate-200 px-3 py-2 text-left font-black">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2">{row.game}</td>
                <td className="px-3 py-2">{row.quarter}</td>
                <td className="px-3 py-2">{row.clock}</td>
                <td className="px-3 py-2 font-bold text-signal">{row.player}</td>
                <td className="px-3 py-2">{row.team}</td>
                <td className="px-3 py-2">{row.opponent}</td>
                <td className="px-3 py-2">{row.playType}</td>
                <td className="px-3 py-2">{row.shotZone}</td>
                <td className="px-3 py-2">{row.shotType}</td>
                <td className="px-3 py-2">{row.defender}</td>
                <td className="px-3 py-2 text-right">{row.defenderDistance}</td>
                <td className="px-3 py-2 text-right">{row.dribbles}</td>
                <td className="px-3 py-2 text-right">{row.touchTime}</td>
                <td className="px-3 py-2 text-right">{row.shotClock}</td>
                <td className="px-3 py-2 text-right">{row.xfg}</td>
                <td className="px-3 py-2 text-right">{row.xpts}</td>
                <td className={`px-3 py-2 font-black ${row.made ? "text-make" : "text-miss"}`}>{row.result}</td>
                <td className="px-3 py-2 text-right">{row.points}</td>
                <td className="px-3 py-2 text-right">{row.ame}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded border border-slate-200 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">Possession {selected.possessionId}</div>
                <h2 className="text-xl font-black text-ink">{selected.player} · {selected.playType}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded border border-slate-300 p-2 hover:bg-slate-50" aria-label="Close possession details">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
              <BasketballCourt className="h-auto w-full">
                <circle cx={courtPoint(selected.x, selected.y).cx} cy={courtPoint(selected.x, selected.y).cy} r="8" fill={selected.made ? "#15803d" : "#b91c1c"} stroke="#fff" strokeWidth="2" />
              </BasketballCourt>
              <div className="grid gap-2 text-sm">
                {[
                  ["Game", selected.game],
                  ["Time", `${selected.quarter} ${selected.clock}`],
                  ["Shot", `${selected.shotZone} · ${selected.shotType}`],
                  ["Defender", `${selected.defender} (${selected.defenderDistance})`],
                  ["Context", `${selected.dribbles} dribbles · ${selected.touchTime} touch · ${selected.shotClock}s clock`],
                  ["Expected", `${selected.xfg} · ${selected.xpts} xPTS`],
                  ["Result", `${selected.result}, ${selected.points} points`],
                  ["Actual - Expected", selected.ame],
                  ["Video", "Placeholder: licensed video can be attached by possession id"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded border border-slate-200 p-2">
                    <div className="text-xs font-black uppercase text-slate-500">{label}</div>
                    <div className="font-semibold text-ink">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
