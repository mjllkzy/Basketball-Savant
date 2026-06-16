import type { Shot } from "@/lib/types";
import { BasketballCourt, courtPoint } from "@/components/charts/BasketballCourt";

export function ShotChart({ shots, colorBy = "result", maxShots = 260 }: { shots: Shot[]; colorBy?: "result" | "xpts"; maxShots?: number }) {
  const visible = shots.slice(0, maxShots);
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-ink">Shot Chart</h3>
        <span className="text-xs font-bold text-slate-500">{shots.length} attempts</span>
      </div>
      <BasketballCourt className="h-auto w-full">
        {visible.map((shot) => {
          const point = courtPoint(shot.x, shot.y);
          const color = colorBy === "xpts" ? `rgba(15, 118, 110, ${Math.max(0.35, Math.min(0.95, shot.expectedPoints / 1.5))})` : shot.made ? "#15803d" : "#b91c1c";
          return (
            <circle key={shot.id} cx={point.cx} cy={point.cy} r={shot.made ? 5 : 4} fill={color} stroke="#fff" strokeWidth="1.2" opacity="0.92">
              <title>{`${shot.shotZone} · ${shot.made ? "Make" : "Miss"} · xPTS ${shot.expectedPoints.toFixed(2)}`}</title>
            </circle>
          );
        })}
      </BasketballCourt>
    </div>
  );
}
