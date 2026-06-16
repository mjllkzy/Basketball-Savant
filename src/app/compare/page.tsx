import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { RollingLineChart } from "@/components/charts/RollingLineChart";
import { PercentileBar } from "@/components/ui/PercentileBar";
import { getPlayerProfile, players } from "@/lib/data/queries";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

const defaultKeys = ["pts", "reb", "ast", "ts_pct", "efg_pct", "three_pct", "usage_rate", "stocks"];

export default function ComparePage({ searchParams }: { searchParams: RouteSearchParams }) {
  const selected = (singleParam(searchParams, "players") ?? players.slice(0, 3).map((player) => player.slug).join(",")).split(",").filter(Boolean).slice(0, 4);
  const profiles = selected.map((slug) => getPlayerProfile(slug)).filter((profile): profile is NonNullable<ReturnType<typeof getPlayerProfile>> => Boolean(profile));
  const rows = defaultKeys.map((key) => ({
    metric: getMetric(key).label,
    ...Object.fromEntries(profiles.map((profile) => [profile.player.name, formatMetric(key, calculatePlayerMetric(key, profile.aggregate))]))
  }));
  const chartData = profiles[0]?.aggregate.recentGameScores.map((game, index) => ({
    date: game.date.slice(5),
    ...Object.fromEntries(profiles.map((profile) => [profile.player.name, profile.aggregate.recentGameScores[index]?.pts ?? 0]))
  })) ?? [];

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Compare" title="Player Comparison" description="Select two to four players and compare summary cards, rolling trends, role traits, and percentile edges." />
      <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_120px]">
        <input name="players" defaultValue={selected.join(",")} className="rounded border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Compare</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {profiles.map((profile) => (
          <div key={profile.player.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{profile.team.abbreviation} · {profile.player.position}</div>
            <h2 className="mt-1 text-xl font-black text-ink">{profile.player.name}</h2>
            <div className="mt-3 grid gap-2">
              <PercentileBar label="True Shooting" value={profile.metricValues.find((value) => value.metricKey === "ts_pct")?.percentile ?? 0} />
              <PercentileBar label="Usage" value={profile.metricValues.find((value) => value.metricKey === "usage_rate")?.percentile ?? 0} />
              <PercentileBar label="Stocks" value={profile.metricValues.find((value) => value.metricKey === "stocks")?.percentile ?? 0} />
            </div>
          </div>
        ))}
      </div>
      <RollingLineChart data={chartData} lines={profiles.map((profile) => profile.player.name)} />
      <StatTable columns={[{ key: "metric", label: "Metric" }, ...profiles.map((profile) => ({ key: profile.player.name, label: profile.player.name, align: "right" as const }))]} rows={rows} />
      <div className="rounded border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        Edge summary: compare shot quality and usage together. A player with high shot quality and lower usage is often a scalable finisher, while high usage with positive actual-over-expected points signals harder self-created shotmaking.
      </div>
    </div>
  );
}
