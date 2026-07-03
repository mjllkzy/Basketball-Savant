import type { Shot } from "@/lib/types";
import { BasketballCourt, courtPoint } from "@/components/charts/BasketballCourt";
import { ShotZoneLayer, shotZoneStats } from "@/components/charts/ShotZoneLayer";
import { tableColumnWidths, tableMinWidth } from "@/components/ui/tableSizing";
import { formatMetric } from "@/lib/metrics/format";

function sampleShots(shots: Shot[], maxShots: number) {
  if (shots.length <= maxShots) return shots;
  const step = shots.length / maxShots;
  return Array.from({ length: maxShots }, (_, index) => shots[Math.floor(index * step)]);
}

const zoneSummaryColumns = [
  { key: "zone", label: "Zone", width: tableColumnWidths.text, align: "left" },
  { key: "frequency", label: "Freq", width: tableColumnWidths.compact, align: "right" },
  { key: "fg", label: "FG%", width: tableColumnWidths.compact, align: "right" },
  { key: "efg", label: "eFG%", width: tableColumnWidths.compact, align: "right" },
] as const;

const zoneSummaryTableMinWidth = tableMinWidth(zoneSummaryColumns);

function alignClass(align: typeof zoneSummaryColumns[number]["align"]) {
  if (align === "right") return "text-right tabular-nums";
  return "text-left";
}

export function TeamShotMap({ shots, maxShots = 650 }: { shots: Shot[]; maxShots?: number }) {
  const stats = shotZoneStats(shots);
  const visibleShots = sampleShots(shots, maxShots);
  const populatedStats = stats.filter((stat) => stat.attempts > 0);
  const mostUsed = [...populatedStats].sort((a, b) => b.attempts - a.attempts)[0];
  const best = [...populatedStats].sort((a, b) => b.efgPct - a.efgPct)[0];
  const lowest = [...populatedStats].sort((a, b) => a.efgPct - b.efgPct)[0];

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-ink">Shot Map</h3>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">NBA Stats shot locations</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-signal">{shots.length.toLocaleString()}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Attempts</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <BasketballCourt className="h-auto w-full">
          {!visibleShots.length ? (
            <text x="250" y="258" textAnchor="middle" fill="#64748b" fontSize="15" fontWeight="800">
              Official shot events unavailable
            </text>
          ) : null}
          <ShotZoneLayer shots={shots} variant="fill" />
          {visibleShots.map((shot) => {
            const point = courtPoint(shot.x, shot.y);
            return (
              <circle
                key={shot.id}
                cx={point.cx}
                cy={point.cy}
                r={shot.made ? 3.5 : 3}
                fill={shot.made ? "#15803d" : "#be123c"}
                stroke="#fff"
                strokeWidth="0.9"
                opacity="0.78"
              >
                <title>{`${shot.shotZone} · ${shot.made ? "Make" : "Miss"} · ${shot.shotDistance} ft`}</title>
              </circle>
            );
          })}
          <ShotZoneLayer shots={shots} variant="hover" />
        </BasketballCourt>

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Most Used", value: mostUsed ? mostUsed.zone : "N/A", detail: mostUsed ? `${mostUsed.attempts.toLocaleString()} shots` : "" },
              { label: "Best eFG", value: best ? best.zone : "N/A", detail: best ? formatMetric("efg_pct", best.efgPct) : "" },
              { label: "Lowest eFG", value: lowest ? lowest.zone : "N/A", detail: lowest ? formatMetric("efg_pct", lowest.efgPct) : "" }
            ].map((item) => (
              <div key={item.label} className="border-l-4 border-signal bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</div>
                <div className="mt-1 text-sm font-black text-ink">{item.value}</div>
                <div className="text-xs font-bold text-slate-500">{item.detail}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm" style={zoneSummaryTableMinWidth ? { minWidth: zoneSummaryTableMinWidth } : undefined}>
              <colgroup>
                {zoneSummaryColumns.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>
              <thead className="bg-slate-100 text-xs uppercase tracking-widest text-slate-600">
                <tr>
                  {zoneSummaryColumns.map((column) => (
                    <th key={column.key} className={`h-11 overflow-hidden whitespace-nowrap border-b border-slate-200 px-3 py-2 align-middle font-black ${alignClass(column.align)}`}>
                      <span className="block truncate">{column.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.zone} className="border-b border-slate-100">
                    <td className="h-14 overflow-hidden whitespace-nowrap px-3 py-2 align-middle font-bold text-ink">{stat.zone}</td>
                    <td className="h-14 overflow-hidden whitespace-nowrap px-3 py-2 text-right align-middle font-semibold tabular-nums text-slate-700">
                      {formatMetric("usage_rate", stat.attemptShare)}
                      <div className="text-[11px] font-bold text-slate-400">{stat.attempts.toLocaleString()}</div>
                    </td>
                    <td className="h-14 overflow-hidden whitespace-nowrap px-3 py-2 text-right align-middle font-semibold tabular-nums text-slate-700">{formatMetric("fg_pct", stat.fgPct)}</td>
                    <td className="h-14 overflow-hidden whitespace-nowrap px-3 py-2 text-right align-middle font-black tabular-nums text-signal">{formatMetric("efg_pct", stat.efgPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
