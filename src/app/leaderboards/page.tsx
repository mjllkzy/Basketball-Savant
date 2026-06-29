import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { listPlayerLeaderboard } from "@/lib/db/leaderboards.server";
import { defaultLeaderboardMetric, isLeaderboardMetricFeedRequired, leaderboardTabs } from "@/lib/leaderboards";
import { getMetric, metricRegistry } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { DEFAULT_SEASON, baseSeasonOptions, parseSeason } from "@/lib/seasons";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

function leaderboardHref(category: string, metric: string, season: string) {
  const params = new URLSearchParams({ category, metric });
  if (season !== DEFAULT_SEASON) params.set("season", season);
  return `/leaderboards?${params.toString()}`;
}

function playerHref(slug: string, season: string) {
  return season === DEFAULT_SEASON ? `/players/${slug}` : `/players/${slug}?season=${encodeURIComponent(season)}`;
}

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const category = singleParam(resolvedSearchParams, "category") ?? "Scoring";
  const metricKey = singleParam(resolvedSearchParams, "metric") ?? defaultLeaderboardMetric(category);
  const season = parseSeason(singleParam(resolvedSearchParams, "season"));
  const metric = getMetric(metricKey);
  const feedRequired = isLeaderboardMetricFeedRequired(metricKey);
  const leaderboard = feedRequired ? { rows: [], source: "json" as const } : await listPlayerLeaderboard(metricKey, 50, season);
  const hasValues = leaderboard.rows.some((row) => row.value !== null);
  const rows = leaderboard.rows.map((row) => ({
    rank: row.rank,
    player: row.playerName,
    href: playerHref(row.playerSlug, season),
    team: row.teamAbbreviation,
    pos: row.position,
    value: formatMetric(metricKey, row.value),
    percentile: row.percentile,
    sample: row.games
  }));

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Leaderboards"
        title={`${category} Leaderboard`}
        description={feedRequired ? `${metric.label} requires a shot, possession, lineup, or tracking feed that is not loaded in the current official snapshot.` : `${metric.label}: ${metric.description}`}
      />
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <form className="rounded border border-slate-200 bg-white p-3 shadow-sm">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="metric" value={metricKey} />
          <label className="grid gap-1">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Season</span>
            <select name="season" defaultValue={season} className="rounded border border-slate-300 px-3 py-2 text-sm">
              {baseSeasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="mt-2 w-full rounded bg-ink px-3 py-2 text-sm font-black text-white">Apply</button>
        </form>
        {leaderboardTabs.map((tab) => (
          <Link key={tab.category} href={leaderboardHref(tab.category, tab.metricKey, season)} className={`rounded border p-3 shadow-sm ${tab.category === category ? "border-signal bg-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{tab.category}</div>
            <div className="mt-1 text-sm font-black text-ink">{getMetric(tab.metricKey).shortLabel}</div>
            {tab.status === "feed-required" ? <div className="mt-2 text-xs font-bold text-slate-500">{tab.note}</div> : null}
          </Link>
        ))}
        <Link href={season === DEFAULT_SEASON ? "/leaderboards/custom" : `/leaderboards/custom?season=${encodeURIComponent(season)}`} className="rounded border border-court bg-white p-3 shadow-sm hover:bg-slate-50">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-court">Builder</div>
          <div className="mt-1 text-sm font-black text-ink">Custom</div>
        </Link>
      </section>
      {feedRequired || !hasValues ? (
        <div className="rounded border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          <h2 className="mb-2 text-lg font-black text-ink">{metric.label} Feed Required</h2>
          <p>
            ShotClock will not rank this metric from box-score aggregates. It needs row-level event, lineup, model, or tracking data with stable game, team, and player IDs before values can be displayed.
          </p>
          <Link href="/visuals?tab=Data%20Coverage" className="mt-3 inline-flex rounded border border-slate-200 px-3 py-2 text-sm font-black text-ink hover:bg-slate-50">
            View Data Coverage
          </Link>
        </div>
      ) : (
        <div data-data-source={leaderboard.source}>
          <StatTable columns={[{ key: "rank", label: "Rk", align: "right" }, { key: "player", label: "Player", hrefKey: "href" }, { key: "team", label: "Team" }, { key: "pos", label: "Pos" }, { key: "value", label: metric.shortLabel, align: "right" }, { key: "percentile", label: "Pctile", align: "right" }, { key: "sample", label: "G", align: "right" }]} rows={rows} />
        </div>
      )}
      <div className="rounded border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        The metric registry currently includes {metricRegistry.length} definitions. Box-score and NBA Stats Advanced metrics are active; event, model, lineup, and tracking metrics stay gated until those feeds are loaded.
      </div>
    </div>
  );
}
