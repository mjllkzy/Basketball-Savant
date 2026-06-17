import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { getPlayerLeaderboard } from "@/lib/data/queries";
import { defaultLeaderboardMetric, isLeaderboardMetricFeedRequired, leaderboardTabs } from "@/lib/leaderboards";
import { getMetric, metricRegistry } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

export default function LeaderboardsPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const category = singleParam(searchParams, "category") ?? "Scoring";
  const metricKey = singleParam(searchParams, "metric") ?? defaultLeaderboardMetric(category);
  const metric = getMetric(metricKey);
  const feedRequired = isLeaderboardMetricFeedRequired(metricKey);
  const leaderboard = feedRequired ? [] : getPlayerLeaderboard(metricKey, { limit: 50 });
  const hasValues = leaderboard.some((row) => row.value !== null);
  const rows = leaderboard.map((row) => ({
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
      <PageHeader
        eyebrow="Leaderboards"
        title={`${category} Leaderboard`}
        description={feedRequired ? `${metric.label} requires a shot, possession, lineup, or tracking feed that is not loaded in the current official snapshot.` : `${metric.label}: ${metric.description}`}
      />
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {leaderboardTabs.map((tab) => (
          <Link key={tab.category} href={`/leaderboards?category=${encodeURIComponent(tab.category)}&metric=${tab.metricKey}`} className={`rounded border p-3 shadow-sm ${tab.category === category ? "border-signal bg-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{tab.category}</div>
            <div className="mt-1 text-sm font-black text-ink">{getMetric(tab.metricKey).shortLabel}</div>
            {tab.status === "feed-required" ? <div className="mt-2 text-xs font-bold text-slate-500">{tab.note}</div> : null}
          </Link>
        ))}
        <Link href="/leaderboards/custom" className="rounded border border-court bg-white p-3 shadow-sm hover:bg-slate-50">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-court">Builder</div>
          <div className="mt-1 text-sm font-black text-ink">Custom</div>
        </Link>
      </section>
      {feedRequired || !hasValues ? (
        <div className="rounded border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          <h2 className="mb-2 text-lg font-black text-ink">{metric.label} Feed Required</h2>
          <p>
            Basketball Savant will not rank this metric from box-score aggregates. It needs row-level event, lineup, model, or tracking data with stable game, team, and player IDs before values can be displayed.
          </p>
          <Link href="/visuals?tab=Data%20Coverage" className="mt-3 inline-flex rounded border border-slate-200 px-3 py-2 text-sm font-black text-ink hover:bg-slate-50">
            View Data Coverage
          </Link>
        </div>
      ) : (
        <StatTable columns={[{ key: "rank", label: "Rk", align: "right" }, { key: "player", label: "Player", hrefKey: "href" }, { key: "team", label: "Team" }, { key: "pos", label: "Pos" }, { key: "value", label: metric.shortLabel, align: "right" }, { key: "percentile", label: "Pctile", align: "right" }, { key: "sample", label: "G", align: "right" }]} rows={rows} />
      )}
      <div className="rounded border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        The metric registry currently includes {metricRegistry.length} definitions. Box-score and NBA Stats Advanced metrics are active; event, model, lineup, and tracking metrics stay gated until those feeds are loaded.
      </div>
    </div>
  );
}
