import type { ShotZone } from "@/lib/types";
import type { Shot } from "@/lib/types";
import { BasketballCourt } from "@/components/charts/BasketballCourt";
import { safeDiv } from "@/lib/metrics/formulas";

const zones: Array<{ zone: ShotZone; x: number; y: number; width: number; height: number }> = [
  { zone: "Rim", x: 205, y: 62, width: 90, height: 70 },
  { zone: "Short Midrange", x: 155, y: 130, width: 190, height: 88 },
  { zone: "Long Midrange", x: 95, y: 220, width: 310, height: 88 },
  { zone: "Corner Three", x: 18, y: 64, width: 64, height: 118 },
  { zone: "Above Break Three", x: 85, y: 320, width: 330, height: 100 }
];

export function ShotHeatmap({ shots, mode = "frequency" }: { shots: Shot[]; mode?: "frequency" | "efficiency" }) {
  const maxCount = Math.max(...zones.map((zone) => shots.filter((shot) => shot.shotZone === zone.zone).length), 1);
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-ink">Shot Heatmap</h3>
        <span className="text-xs font-bold text-slate-500">{mode}</span>
      </div>
      <BasketballCourt className="h-auto w-full">
        {zones.map((zone) => {
          const zoneShots = shots.filter((shot) => shot.shotZone === zone.zone);
          const frequency = zoneShots.length / maxCount;
          const efficiency = safeDiv(zoneShots.filter((shot) => shot.made).length, zoneShots.length) ?? 0;
          const value = mode === "frequency" ? frequency : efficiency;
          return (
            <g key={zone.zone}>
              <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="14" fill="#0f766e" opacity={Math.max(0.08, Math.min(0.72, value))} />
              <text x={zone.x + zone.width / 2} y={zone.y + zone.height / 2} textAnchor="middle" dominantBaseline="middle" fill="#101820" fontSize="13" fontWeight="800">
                {zone.zone}
              </text>
              <text x={zone.x + zone.width / 2} y={zone.y + zone.height / 2 + 18} textAnchor="middle" fill="#475569" fontSize="11" fontWeight="700">
                {zoneShots.length} · {Math.round(efficiency * 100)}%
              </text>
            </g>
          );
        })}
      </BasketballCourt>
    </div>
  );
}
