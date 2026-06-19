import type { Shot, ShotZone } from "@/lib/types";
import { BasketballCourt, courtPoint } from "@/components/charts/BasketballCourt";
import { safeDiv } from "@/lib/metrics/formulas";
import { formatMetric } from "@/lib/metrics/format";

type ZoneShape = { x: number; y: number; width: number; height: number; rx?: number };

const zones: Array<{ zone: ShotZone; shapes: ZoneShape[] }> = [
  { zone: "Rim", shapes: [{ x: 205, y: 62, width: 90, height: 70, rx: 16 }] },
  { zone: "Short Midrange", shapes: [{ x: 150, y: 125, width: 200, height: 100, rx: 18 }] },
  { zone: "Long Midrange", shapes: [{ x: 95, y: 230, width: 310, height: 92, rx: 18 }] },
  {
    zone: "Corner Three",
    shapes: [
      { x: 16, y: 60, width: 70, height: 130, rx: 14 },
      { x: 414, y: 60, width: 70, height: 130, rx: 14 }
    ]
  },
  { zone: "Above Break Three", shapes: [{ x: 80, y: 325, width: 340, height: 105, rx: 20 }] }
];

function sampleShots(shots: Shot[], maxShots: number) {
  if (shots.length <= maxShots) return shots;
  const step = shots.length / maxShots;
  return Array.from({ length: maxShots }, (_, index) => shots[Math.floor(index * step)]);
}

function zoneStats(shots: Shot[]) {
  const totalAttempts = shots.length;
  return zones.map(({ zone }) => {
    const zoneShots = shots.filter((shot) => shot.shotZone === zone);
    const attempts = zoneShots.length;
    const made = zoneShots.filter((shot) => shot.made).length;
    const points = zoneShots.reduce((sum, shot) => sum + (shot.made ? shot.pointsValue : 0), 0);
    return {
      zone,
      attempts,
      made,
      attemptShare: safeDiv(attempts, totalAttempts) ?? 0,
      fgPct: safeDiv(made, attempts) ?? 0,
      efgPct: safeDiv(points, attempts * 2) ?? 0
    };
  });
}

export function TeamShotMap({ shots, maxShots = 650 }: { shots: Shot[]; maxShots?: number }) {
  const stats = zoneStats(shots);
  const maxAttempts = Math.max(...stats.map((stat) => stat.attempts), 1);
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
          {zones.map(({ zone, shapes }) => {
            const stat = stats.find((item) => item.zone === zone)!;
            const opacity = Math.max(0.08, Math.min(0.56, 0.1 + (stat.attempts / maxAttempts) * 0.46));
            const title = `${zone}: ${stat.attempts.toLocaleString()} attempts (${formatMetric("usage_rate", stat.attemptShare)} of shots), FG ${formatMetric("fg_pct", stat.fgPct)}, eFG ${formatMetric("efg_pct", stat.efgPct)}`;
            return (
              <g key={zone}>
                <title>{title}</title>
                {shapes.map((shape, index) => (
                  <rect
                    key={`${zone}-${index}`}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx={shape.rx ?? 12}
                    fill="#0f766e"
                    opacity={opacity}
                    stroke="#0f766e"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}
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
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-widest text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">Zone</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Freq</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">FG%</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">eFG%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.zone} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-bold text-ink">{stat.zone}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700">
                      {formatMetric("usage_rate", stat.attemptShare)}
                      <div className="text-[11px] font-bold text-slate-400">{stat.attempts.toLocaleString()}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatMetric("fg_pct", stat.fgPct)}</td>
                    <td className="px-3 py-2 text-right font-black text-signal">{formatMetric("efg_pct", stat.efgPct)}</td>
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
