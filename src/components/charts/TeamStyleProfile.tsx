import type { TeamSeasonAggregate } from "@/lib/types";
import { calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

type StyleMetric = {
  key: string;
  label: string;
  note: string;
  lowerIsBetter?: boolean;
};

const styleMetrics: StyleMetric[] = [
  { key: "pace", label: "Tempo", note: "Possessions per 48" },
  { key: "off_rating", label: "Offense", note: "Points per 100 poss" },
  { key: "def_rating", label: "Defense", note: "Allowed per 100", lowerIsBetter: true },
  { key: "net_rating", label: "Net", note: "Offense minus defense" },
  { key: "efg_pct", label: "Shot Making", note: "eFG%" },
  { key: "three_pct", label: "3P Accuracy", note: "3P%" }
];

function metricValue(row: TeamSeasonAggregate, key: string) {
  return calculateTeamMetric(key, row);
}

function ordinal(value: number) {
  const suffix = value % 10 === 1 && value % 100 !== 11 ? "st" : value % 10 === 2 && value % 100 !== 12 ? "nd" : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
  return `${value}${suffix}`;
}

function rankMetric(rows: TeamSeasonAggregate[], current: TeamSeasonAggregate, metric: StyleMetric) {
  const ranked = rows
    .map((row) => ({ row, value: metricValue(row, metric.key) }))
    .filter((item): item is { row: TeamSeasonAggregate; value: number } => item.value !== null && Number.isFinite(item.value))
    .sort((a, b) => metric.lowerIsBetter ? a.value - b.value : b.value - a.value);
  const rank = ranked.findIndex((item) => item.row.team.id === current.team.id) + 1;
  const value = metricValue(current, metric.key);
  const sample = ranked.length || 1;
  const strength = sample === 1 || rank <= 0 ? 0 : 1 - (rank - 1) / (sample - 1);
  return { rank, sample, value, strength };
}

function normalize(value: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function closestStyleTeams(rows: TeamSeasonAggregate[], current: TeamSeasonAggregate) {
  const keys = ["pace", "off_rating", "def_rating", "efg_pct", "three_pct", "net_rating"];
  const ranges = new Map(keys.map((key) => [key, rows.map((row) => metricValue(row, key)).filter((value): value is number => value !== null && Number.isFinite(value))]));
  const currentValues = new Map(keys.map((key) => [key, metricValue(current, key)]));

  return rows
    .filter((row) => row.team.id !== current.team.id)
    .map((row) => {
      const distance = keys.reduce((sum, key) => {
        const currentValue = currentValues.get(key);
        const rowValue = metricValue(row, key);
        const values = ranges.get(key) ?? [];
        if (currentValue === undefined || currentValue === null || rowValue === null || !Number.isFinite(currentValue) || !Number.isFinite(rowValue) || values.length < 2) return sum;
        const diff = normalize(currentValue, values) - normalize(rowValue, values);
        return sum + diff * diff;
      }, 0);
      return { row, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}

function teamTrait(rows: TeamSeasonAggregate[], current: TeamSeasonAggregate, metric: StyleMetric, strong: string, middle: string, weak: string) {
  const ranked = rankMetric(rows, current, metric);
  if (!ranked.rank) return middle;
  if (ranked.rank <= 10) return strong;
  if (ranked.rank <= 20) return middle;
  return weak;
}

export function TeamStyleProfile({ team, teams }: { team: TeamSeasonAggregate; teams: TeamSeasonAggregate[] }) {
  const peers = closestStyleTeams(teams, team);
  const traits = [
    teamTrait(teams, team, styleMetrics[0], "Fast Tempo", "Balanced Tempo", "Deliberate Tempo"),
    teamTrait(teams, team, styleMetrics[1], "High-End Offense", "Middle Offense", "Low-Output Offense"),
    teamTrait(teams, team, styleMetrics[2], "Stingy Defense", "Middle Defense", "Leaky Defense"),
    teamTrait(teams, team, styleMetrics[4], "Efficient Shot Making", "Average Shot Making", "Cold Shot Profile")
  ];

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-ink">Team Style Profile</h3>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">League context from official team stats</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-signal">{formatMetric("net_rating", metricValue(team, "net_rating"))}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Net Rating</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {traits.map((trait) => (
          <span key={trait} className="border-l-4 border-signal bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-600">
            {trait}
          </span>
        ))}
      </div>

      <div className="grid gap-3">
        {styleMetrics.map((metric) => {
          const ranked = rankMetric(teams, team, metric);
          const width = `${Math.max(6, Math.round(ranked.strength * 100))}%`;
          return (
            <div key={metric.key} className="grid gap-1">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-ink">{metric.label}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{metric.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-ink">{formatMetric(metric.key, ranked.value)}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {ranked.rank ? `${ordinal(ranked.rank)} of ${ranked.sample}` : "N/A"}
                  </div>
                </div>
              </div>
              <div className="h-2 overflow-hidden bg-slate-100">
                <div className="h-full bg-signal" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Closest Style Teams</div>
        <div className="grid gap-2">
          {peers.map(({ row }) => (
            <a key={row.team.id} href={`/teams/${row.team.slug}`} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 py-2 text-sm last:border-b-0">
              <span className="font-black text-signal">{row.team.city} {row.team.name}</span>
              <span className="text-right font-semibold text-slate-600">
                Pace {formatMetric("pace", metricValue(row, "pace"))} - Net {formatMetric("net_rating", metricValue(row, "net_rating"))} - eFG {formatMetric("efg_pct", metricValue(row, "efg_pct"))}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
