import type { Shot } from "@/lib/types";
import { BasketballCourt, courtPoint } from "@/components/charts/BasketballCourt";
import { ShotZoneLayer } from "@/components/charts/ShotZoneLayer";

export function sampleShotsForChart<T>(shots: T[], maxShots: number): T[] {
  const safeMaxShots = Math.max(0, Math.floor(maxShots));
  if (safeMaxShots === 0) return [];
  if (shots.length <= safeMaxShots) return shots;

  const step = shots.length / safeMaxShots;
  return Array.from({ length: safeMaxShots }, (_, index) => shots[Math.min(shots.length - 1, Math.floor(index * step))]);
}

export function shotChartAttemptLabel(shownAttempts: number, totalAttempts: number) {
  if (shownAttempts > 0 && shownAttempts < totalAttempts) {
    return `${shownAttempts.toLocaleString()} shown · ${totalAttempts.toLocaleString()} attempts`;
  }
  return `${totalAttempts.toLocaleString()} attempts`;
}

export function ShotChart({
  shots,
  colorBy = "result",
  maxShots = 260,
  totalAttempts
}: {
  shots: Shot[];
  colorBy?: "result" | "xpts";
  maxShots?: number;
  totalAttempts?: number;
}) {
  const visible = sampleShotsForChart(shots, maxShots);
  const attempts = Math.max(totalAttempts ?? shots.length, shots.length);
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-ink">Shot Chart</h3>
        <span className="text-xs font-bold text-slate-500">{shotChartAttemptLabel(visible.length, attempts)}</span>
      </div>
      <BasketballCourt className="h-auto w-full">
        {!visible.length ? (
          <text x="250" y="258" textAnchor="middle" fill="#64748b" fontSize="15" fontWeight="800">
            Official shot events unavailable
          </text>
        ) : null}
        <ShotZoneLayer shots={shots} variant="fill" />
        {visible.map((shot) => {
          const point = courtPoint(shot.x, shot.y);
          const color = colorBy === "xpts" ? `rgba(15, 118, 110, ${Math.max(0.35, Math.min(0.95, shot.expectedPoints / 1.5))})` : shot.made ? "#15803d" : "#b91c1c";
          const title = colorBy === "xpts"
            ? `${shot.shotZone} · ${shot.made ? "Make" : "Miss"} · xPTS ${shot.expectedPoints.toFixed(2)}`
            : `${shot.shotZone} · ${shot.made ? "Make" : "Miss"} · ${shot.shotDistance} ft`;
          return (
            <circle key={shot.id} cx={point.cx} cy={point.cy} r={shot.made ? 5 : 4} fill={color} stroke="#fff" strokeWidth="1.2" opacity="0.92">
              <title>{title}</title>
            </circle>
          );
        })}
        <ShotZoneLayer shots={shots} variant="hover" />
      </BasketballCourt>
    </div>
  );
}
