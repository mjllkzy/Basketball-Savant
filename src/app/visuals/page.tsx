import { GameFlowChart } from "@/components/charts/GameFlowChart";
import { LineupNetwork } from "@/components/charts/LineupNetwork";
import { PassNetwork } from "@/components/charts/PassNetwork";
import { PercentileRadar } from "@/components/charts/PercentileRadar";
import { RollingLineChart } from "@/components/charts/RollingLineChart";
import { ShotChart } from "@/components/charts/ShotChart";
import { ShotHeatmap } from "@/components/charts/ShotHeatmap";
import { TeamStyleScatter } from "@/components/charts/TeamStyleScatter";
import { PageHeader } from "@/components/ui/PageHeader";
import { gameFlow, getPlayerProfile, latestGames, lineups, passes, players, shots, teamSeasonAggregates } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
import { toPercentagePoints } from "@/lib/metrics/format";
import { calculateTeamMetric, getMetric } from "@/lib/metrics/registry";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

const tabs = ["Shot Chart", "Shot Heatmap", "Pass Map", "Touch Map", "Rolling Trend", "Player Radar", "Lineup Network", "Team Style Map"];

export default function VisualsPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const tab = singleParam(searchParams, "tab") ?? "Shot Chart";
  const featuredPlayer = getPlayerProfile(players[0].slug)!;
  const styleData = teamSeasonAggregates.map((row) => ({
    name: row.team.abbreviation,
    pace: calculateTeamMetric("pace", row) ?? 0,
    shotQuality: toPercentagePoints(calculateTeamMetric("efg_pct", row)) ?? 0,
    net: calculateTeamMetric("net_rating", row) ?? 0
  }));
  const radarKeys = ["pts", "reb", "ast", "ts_pct", "usage_rate", "stocks"];
  const latest = latestGames(1)[0];
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Visualization Lab" title="Visuals" description="Shot charts, heatmaps, pass networks, touch maps, rolling trends, radar, lineup network, and team style map when real feeds are loaded." />
      <div className="table-scroll flex gap-2 overflow-x-auto">
        {tabs.map((item) => <a key={item} href={`/visuals?tab=${encodeURIComponent(item)}`} className={`shrink-0 rounded border px-3 py-2 text-sm font-bold ${tab === item ? "border-signal bg-white text-signal" : "border-slate-200 bg-white text-slate-600"}`}>{item}</a>)}
      </div>
      <section className="grid gap-4 xl:grid-cols-2">
        <ShotChart shots={featuredPlayer.shots} colorBy="xpts" />
        <ShotHeatmap shots={featuredPlayer.shots} mode={tab === "Shot Heatmap" ? "efficiency" : "frequency"} />
        <PassNetwork passes={passes} players={players.filter((player) => player.teamId === featuredPlayer.team.id)} />
        <RollingLineChart data={featuredPlayer.aggregate.recentGameScores.map((row) => ({ date: formatShortDate(row.date), pts: row.pts, ts: toPercentagePoints(row.ts) ?? 0, usage: toPercentagePoints(row.usage) ?? 0 }))} lines={["pts", "ts", "usage"]} />
        <PercentileRadar data={radarKeys.map((key) => ({ metric: getMetric(key).shortLabel, percentile: featuredPlayer.metricValues.find((metricValue) => metricValue.metricKey === key)?.percentile ?? 0 }))} />
        <LineupNetwork lineups={lineups} players={players} />
        <TeamStyleScatter data={styleData} />
        {latest ? <GameFlowChart data={gameFlow(latest.id)} /> : null}
      </section>
      <div className="rounded border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        Touch maps require real tracking or event-location data. Basketball Savant leaves them unavailable until a licensed source is connected.
      </div>
    </div>
  );
}
