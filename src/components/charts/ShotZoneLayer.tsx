import type { Shot, ShotZone } from "@/lib/types";
import { safeDiv } from "@/lib/metrics/formulas";
import { formatMetric } from "@/lib/metrics/format";

export type ShotZoneStat = {
  zone: ShotZone;
  attempts: number;
  made: number;
  attemptShare: number;
  fgPct: number;
  efgPct: number;
};

type ShotZoneSpec = {
  zone: ShotZone;
  label: string;
  shortLabel: string;
  color: string;
  paths: string[];
  labelX: number;
  labelY: number;
  tooltipX: number;
  tooltipY: number;
  tooltipWidth: number;
};

const shotZoneOrder: ShotZone[] = ["Rim", "Short Midrange", "Long Midrange", "Corner Three", "Above Break Three"];

const shotZoneSpecs: ShotZoneSpec[] = [
  {
    zone: "Above Break Three",
    label: "Above Break Three",
    shortLabel: "Above Break",
    color: "#2563eb",
    paths: ["M30 142 A220 220 0 0 0 470 142 L470 452 L30 452 Z"],
    labelX: 250,
    labelY: 405,
    tooltipX: 154,
    tooltipY: 358,
    tooltipWidth: 192
  },
  {
    zone: "Corner Three",
    label: "Corner Three",
    shortLabel: "Corner 3",
    color: "#7c3aed",
    paths: [
      "M16 58 H86 V180 C67 188 41 188 22 180 L22 58 Z",
      "M414 58 H484 V180 C465 188 439 188 420 180 L420 58 Z"
    ],
    labelX: 250,
    labelY: 156,
    tooltipX: 164,
    tooltipY: 126,
    tooltipWidth: 172
  },
  {
    zone: "Long Midrange",
    label: "Long Midrange",
    shortLabel: "Long Mid",
    color: "#0891b2",
    paths: ["M82 176 C96 254 166 334 250 334 C334 334 404 254 418 176 L356 176 C342 224 300 270 250 270 C200 270 158 224 144 176 Z"],
    labelX: 250,
    labelY: 302,
    tooltipX: 162,
    tooltipY: 276,
    tooltipWidth: 176
  },
  {
    zone: "Short Midrange",
    label: "Short Midrange",
    shortLabel: "Short Mid",
    color: "#0f766e",
    paths: ["M150 112 C177 96 323 96 350 112 L362 214 C334 252 166 252 138 214 Z"],
    labelX: 250,
    labelY: 190,
    tooltipX: 162,
    tooltipY: 166,
    tooltipWidth: 176
  },
  {
    zone: "Rim",
    label: "Rim",
    shortLabel: "Rim",
    color: "#ea580c",
    paths: ["M207 94 A43 36 0 1 0 293 94 A43 36 0 1 0 207 94"],
    labelX: 250,
    labelY: 96,
    tooltipX: 174,
    tooltipY: 74,
    tooltipWidth: 152
  }
];

function statFor(stats: ShotZoneStat[], zone: ShotZone) {
  return stats.find((stat) => stat.zone === zone) ?? {
    zone,
    attempts: 0,
    made: 0,
    attemptShare: 0,
    fgPct: 0,
    efgPct: 0
  };
}

function zoneMetric(stat: ShotZoneStat, intensity: "frequency" | "efficiency") {
  return intensity === "efficiency" ? stat.efgPct : stat.attempts;
}

function zoneOpacity(stat: ShotZoneStat, maxValue: number, intensity: "frequency" | "efficiency") {
  if (!stat.attempts) return 0.08;
  const value = intensity === "efficiency" ? stat.efgPct : stat.attempts / Math.max(maxValue, 1);
  return Math.max(0.14, Math.min(0.52, 0.12 + value * 0.4));
}

export function shotZoneStats(shots: Shot[]): ShotZoneStat[] {
  const totalAttempts = shots.length;

  return shotZoneOrder.map((zone) => {
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

export function ShotZoneLayer({
  shots,
  intensity = "frequency",
  showLabels = false,
  variant = "full"
}: {
  shots: Shot[];
  intensity?: "frequency" | "efficiency";
  showLabels?: boolean;
  variant?: "full" | "fill" | "hover";
}) {
  const stats = shotZoneStats(shots);
  const maxValue = Math.max(...stats.map((stat) => zoneMetric(stat, intensity)), 1);
  const showFill = variant !== "hover";
  const showTooltip = variant !== "fill";

  return (
    <g aria-label="Shot zone efficiency overlay">
      {shotZoneSpecs.map((spec) => {
        const stat = statFor(stats, spec.zone);
        const opacity = zoneOpacity(stat, maxValue, intensity);
        const attemptText = `${stat.attempts.toLocaleString()} att / ${formatMetric("usage_rate", stat.attemptShare)} freq`;
        const efficiencyText = `${formatMetric("fg_pct", stat.fgPct)} FG / ${formatMetric("efg_pct", stat.efgPct)} eFG`;
        const title = `${spec.label}: ${stat.attempts.toLocaleString()} attempts (${formatMetric("usage_rate", stat.attemptShare)} of shots), FG ${formatMetric("fg_pct", stat.fgPct)}, eFG ${formatMetric("efg_pct", stat.efgPct)}`;

        return (
          <g key={spec.zone} className={showTooltip ? "group cursor-help" : undefined} aria-label={title}>
            {showTooltip ? <title>{title}</title> : null}
            {spec.paths.map((path, index) => (
              <path
                key={`${spec.zone}-${index}`}
                d={path}
                fill={showFill ? spec.color : "transparent"}
                opacity={showFill ? opacity : 0}
                stroke={showFill ? spec.color : "transparent"}
                strokeWidth={showFill ? "1.7" : "0"}
                pointerEvents={showTooltip ? "all" : "none"}
                className="transition-opacity duration-150 group-hover:opacity-70"
              />
            ))}
            {showLabels && showFill ? (
              <g pointerEvents="none">
                <text x={spec.labelX} y={spec.labelY} textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="900" opacity="0.8">
                  {spec.shortLabel}
                </text>
                <text x={spec.labelX} y={spec.labelY + 14} textAnchor="middle" fill="#334155" fontSize="9" fontWeight="800" opacity="0.75">
                  {formatMetric("efg_pct", stat.efgPct)} eFG
                </text>
              </g>
            ) : null}
            {showTooltip ? (
              <g pointerEvents="none" className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <rect x={spec.tooltipX} y={spec.tooltipY} width={spec.tooltipWidth} height="52" rx="7" fill="#0f172a" opacity="0.94" />
                <text x={spec.tooltipX + 10} y={spec.tooltipY + 15} fill="#f8fafc" fontSize="10" fontWeight="900">
                  {spec.label}
                </text>
                <text x={spec.tooltipX + 10} y={spec.tooltipY + 31} fill="#cbd5e1" fontSize="9" fontWeight="800">
                  {attemptText}
                </text>
                <text x={spec.tooltipX + 10} y={spec.tooltipY + 44} fill="#99f6e4" fontSize="9" fontWeight="900">
                  {efficiencyText}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
