"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { BasketballCourt, courtPoint } from "@/components/charts/BasketballCourt";
import { tableColumnWidths, tableMinWidth } from "@/components/ui/tableSizing";

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

type ShotSearchColumn = {
  key: string;
  label: string;
  width: string;
  align?: "left" | "right" | "center";
  render: (row: ShotSearchRow) => ReactNode;
};

const shotSearchColumns: ShotSearchColumn[] = [
  { key: "date", label: "Date", width: tableColumnWidths.summary, render: (row) => row.date },
  { key: "game", label: "Game", width: tableColumnWidths.text, render: (row) => row.game },
  { key: "quarter", label: "Q", width: tableColumnWidths.narrow, align: "center", render: (row) => row.quarter },
  { key: "clock", label: "Clock", width: tableColumnWidths.compact, align: "center", render: (row) => row.clock },
  { key: "player", label: "Player", width: tableColumnWidths.entity, render: (row) => <span className="font-bold text-signal">{row.player}</span> },
  { key: "team", label: "Team", width: tableColumnWidths.compact, align: "center", render: (row) => row.team },
  { key: "opponent", label: "Opp", width: tableColumnWidths.compact, align: "center", render: (row) => row.opponent },
  { key: "playType", label: "Play Type", width: tableColumnWidths.text, render: (row) => row.playType },
  { key: "shotZone", label: "Zone", width: tableColumnWidths.text, render: (row) => row.shotZone },
  { key: "shotType", label: "Type", width: tableColumnWidths.text, render: (row) => row.shotType },
  { key: "defender", label: "Defender", width: tableColumnWidths.wideText, render: (row) => row.defender },
  { key: "defenderDistance", label: "Def Dist", width: tableColumnWidths.compact, align: "right", render: (row) => row.defenderDistance },
  { key: "dribbles", label: "Drib", width: tableColumnWidths.compact, align: "right", render: (row) => row.dribbles },
  { key: "touchTime", label: "Touch", width: tableColumnWidths.compact, align: "right", render: (row) => row.touchTime },
  { key: "shotClock", label: "Clock", width: tableColumnWidths.compact, align: "right", render: (row) => row.shotClock },
  { key: "xfg", label: "xFG%", width: tableColumnWidths.compact, align: "right", render: (row) => row.xfg },
  { key: "xpts", label: "xPTS", width: tableColumnWidths.compact, align: "right", render: (row) => row.xpts },
  { key: "result", label: "Result", width: tableColumnWidths.compact, render: (row) => <span className={`font-black ${row.made ? "text-make" : "text-miss"}`}>{row.result}</span> },
  { key: "points", label: "PTS", width: tableColumnWidths.compact, align: "right", render: (row) => row.points },
  { key: "ame", label: "A-xE", width: tableColumnWidths.compact, align: "right", render: (row) => row.ame },
];

const shotSearchTableMinWidth = tableMinWidth(shotSearchColumns);

function alignClass(align: ShotSearchColumn["align"]) {
  if (align === "right") return "text-right tabular-nums";
  if (align === "center") return "text-center tabular-nums";
  return "text-left";
}

export function ShotSearchResults({ rows }: { rows: ShotSearchRow[] }) {
  const [selected, setSelected] = useState<ShotSearchRow | null>(null);
  return (
    <>
      <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed border-collapse text-sm" style={shotSearchTableMinWidth ? { minWidth: shotSearchTableMinWidth } : undefined}>
          <colgroup>
            {shotSearchColumns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              {shotSearchColumns.map((column) => (
                <th key={column.key} className={`h-11 overflow-hidden whitespace-nowrap border-b border-slate-200 px-3 py-2 align-middle font-black ${alignClass(column.align)}`}>
                  <span className="block truncate">{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                {shotSearchColumns.map((column) => (
                  <td key={column.key} className={`h-14 overflow-hidden whitespace-nowrap px-3 py-2 align-middle ${alignClass(column.align)}`}>
                    {column.render(row)}
                  </td>
                ))}
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
