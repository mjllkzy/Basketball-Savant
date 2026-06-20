import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShareUrlButton } from "@/components/ui/ShareUrlButton";
import { StatTable } from "@/components/ui/StatTable";
import { getCustomLeaderboard } from "@/lib/data/queries";
import { getMetric, metricRegistry } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

export default function CustomLeaderboardPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const entityType = (singleParam(searchParams, "entityType") ?? "players") as "players" | "teams" | "lineups";
  const metricKeys = (singleParam(searchParams, "metrics") ?? "pts,reb,ast,stl,blk,ts_pct,efg_pct,usage_rate").split(",").filter(Boolean);
  const rows = getCustomLeaderboard(entityType, metricKeys).map((row, index) => ({
    rank: index + 1,
    entity: row.label,
    team: row.team?.abbreviation ?? "",
    ...Object.fromEntries(metricKeys.map((key) => {
      const values = row.values as Record<string, number | null | undefined>;
      return [key, values[key] === undefined ? "N/A" : formatMetric(key, values[key])];
    }))
  }));

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Custom Builder" title="Custom Leaderboard" description="Choose entity type and metric columns. URL params preserve the table state for sharing." actions={<><ShareUrlButton /><ExportCsvButton rows={rows} filename="custom-leaderboard.csv" /></>} />
      <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[180px_1fr_120px]">
        <select name="entityType" defaultValue={entityType} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="players">Players</option>
          <option value="teams">Teams</option>
          <option value="lineups">Lineups</option>
        </select>
        <input name="metrics" defaultValue={metricKeys.join(",")} className="rounded border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Build</button>
      </form>
      <div className="rounded border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-600 shadow-sm">
        Suggested columns: {metricRegistry.slice(0, 28).map((metric) => metric.key).join(", ")}
      </div>
      <StatTable
        columns={[
          { key: "rank", label: "Rk", align: "right" },
          { key: "entity", label: entityType },
          { key: "team", label: "Team" },
          ...metricKeys.map((key) => ({ key, label: getMetric(key).shortLabel, align: "right" as const }))
        ]}
        rows={rows}
      />
    </div>
  );
}
