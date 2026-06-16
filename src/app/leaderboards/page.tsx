import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { getPlayerLeaderboard } from "@/lib/data/queries";
import { getMetric, metricRegistry } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

const categoryDefaults: Record<string, string> = {
  Scoring: "pts",
  Shooting: "ts_pct",
  "Shot Quality": "efg_pct",
  Creation: "usage_rate",
  Playmaking: "ast",
  Defense: "stocks",
  Rebounding: "reb_pct",
  "Play Type": "transition_ppp",
  Clutch: "ft_pct",
  Lineups: "lineup_net_rating",
  Rolling: "last_10_games",
  Percentiles: "pie"
};

export default function LeaderboardsPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const category = singleParam(searchParams, "category") ?? "Scoring";
  const metricKey = singleParam(searchParams, "metric") ?? categoryDefaults[category] ?? "pts";
  const metric = getMetric(metricKey);
  const rows = getPlayerLeaderboard(metricKey, { limit: 50 }).map((row) => ({
    rank: row.rank,
    player: row.player.name,
    href: `/players/${row.player.slug}`,
    team: row.team.abbreviation,
    pos: row.player.position,
    value: formatMetric(metricKey, row.value),
    percentile: row.percentile,
    sample: row.aggregate.games
  }));

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Leaderboards" title={`${category} Leaderboard`} description={`${metric.label}: ${metric.description}`} />
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(categoryDefaults).map(([label, key]) => (
          <Link key={label} href={`/leaderboards?category=${encodeURIComponent(label)}&metric=${key}`} className={`rounded border p-3 shadow-sm ${label === category ? "border-signal bg-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-black text-ink">{getMetric(key).shortLabel}</div>
          </Link>
        ))}
        <Link href="/leaderboards/custom" className="rounded border border-court bg-white p-3 shadow-sm hover:bg-slate-50">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-court">Builder</div>
          <div className="mt-1 text-sm font-black text-ink">Custom</div>
        </Link>
      </section>
      <StatTable columns={[{ key: "rank", label: "Rk", align: "right" }, { key: "player", label: "Player", hrefKey: "href" }, { key: "team", label: "Team" }, { key: "pos", label: "Pos" }, { key: "value", label: metric.shortLabel, align: "right" }, { key: "percentile", label: "Pctile", align: "right" }, { key: "sample", label: "G", align: "right" }]} rows={rows} />
      <div className="rounded border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        The metric registry currently includes {metricRegistry.length} definitions across traditional, efficiency, shot quality, creation, play type, defense, rebounding, tracking, lineup, and trend categories.
      </div>
    </div>
  );
}
