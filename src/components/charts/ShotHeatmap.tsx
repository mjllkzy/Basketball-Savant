import type { Shot } from "@/lib/types";
import { BasketballCourt } from "@/components/charts/BasketballCourt";
import { ShotZoneLayer } from "@/components/charts/ShotZoneLayer";

export function ShotHeatmap({ shots, mode = "frequency" }: { shots: Shot[]; mode?: "frequency" | "efficiency" }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-ink">Shot Heatmap</h3>
        <span className="text-xs font-bold text-slate-500">{mode}</span>
      </div>
      <BasketballCourt className="h-auto w-full">
        <ShotZoneLayer shots={shots} intensity={mode} showLabels />
      </BasketballCourt>
    </div>
  );
}
