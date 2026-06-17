import Link from "next/link";
import { BarChart3, Crosshair, GitCompare, Search, Target, Trophy } from "lucide-react";
import { GameFlowChart } from "@/components/charts/GameFlowChart";
import { TeamStyleScatter } from "@/components/charts/TeamStyleScatter";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { featuredInsights, gameFlow, gameMatchupLabel, latestGames, teamName, teamSeasonAggregates, topPerformers } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
import { calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

const tools = [
  { href: "/search", label: "Event Search", icon: Search, body: "Inspect shot and possession rows when an event feed is connected." },
  { href: "/leaderboards/custom", label: "Custom Leaderboards", icon: BarChart3, body: "Build player, team, or lineup tables with shareable columns and CSV export." },
  { href: "/compare", label: "Player Comparison", icon: GitCompare, body: "Compare two to four players across profile, role, and impact metrics." },
  { href: "/visuals", label: "Official Visuals", icon: Crosshair, body: "Explore team style, player trends, radar, and scoring leaders from loaded stats." },
  { href: "/games", label: "Gamefeed", icon: Target, body: "Review official scores, game context, box scores, leaders, and gameflow when loaded." },
  { href: "/similarity", label: "Similarity Finder", icon: Trophy, body: "Find players with matching statistical fingerprints and role traits." }
];

export default function HomePage() {
  const performers = topPerformers();
  const games = latestGames(4);
  const styleData = teamSeasonAggregates.map((row) => ({
    name: row.team.abbreviation,
    pace: calculateTeamMetric("pace", row) ?? 0,
    shotQuality: calculateTeamMetric("efg_pct", row) ?? 0,
    net: calculateTeamMetric("net_rating", row) ?? 0
  }));
  const firstGame = games[0];

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Command Center"
        title="Basketball Savant"
        description="Advanced basketball search, leaderboards, visuals, and player intelligence powered by official NBA Stats snapshots and clearly marked unavailable feeds."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {performers.map(({ metric, leader }) => (
          <MetricCard
            key={metric.key}
            label={metric.shortLabel}
            value={leader ? formatMetric(metric.key, leader.value) : "N/A"}
            sublabel={leader ? `${leader.player.name} · ${leader.team.abbreviation}` : "No leader"}
            accent={metric.category === "Shot Quality" ? "court" : "signal"}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-ink">Latest Games</h2>
            <Link href="/games" className="text-sm font-bold text-signal hover:underline">All games</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {games.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600 sm:col-span-2">
                Official game-log scores are not loaded in the current NBA Stats snapshot. Basketball Savant will not display generated game dates or scores.
              </div>
            ) : games.map((game) => {
              const awayTeamName = teamName(game.awayTeamId);
              const homeTeamName = teamName(game.homeTeamId);
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  aria-label={`${gameMatchupLabel(game)}, ${game.awayScore} to ${game.homeScore}`}
                  className="rounded border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{formatShortDate(game.date)}</div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-sm">
                    <span className="min-w-0 leading-5 text-ink">{awayTeamName}</span>
                    <strong>{game.awayScore}</strong>
                    <span className="min-w-0 leading-5 text-ink">{homeTeamName}</span>
                    <strong>{game.homeScore}</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        {firstGame ? (
          <GameFlowChart data={gameFlow(firstGame.id)} />
        ) : (
          <div className="h-72 rounded border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-black text-ink">Gameflow Runs</h3>
            <div className="flex h-[88%] items-center justify-center rounded border border-dashed border-slate-200 px-6 text-center text-sm leading-6 text-slate-500">
              Official possession-level gameflow is unavailable until a real play-by-play or possession feed is connected.
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <TeamStyleScatter data={styleData} />
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-ink">Top Performers</h2>
          <StatTable
            dense
            columns={[
              { key: "category", label: "Category" },
              { key: "player", label: "Player", hrefKey: "href" },
              { key: "team", label: "Team" },
              { key: "value", label: "Value", align: "right" },
              { key: "pct", label: "Pctile", align: "right" }
            ]}
            rows={performers.map(({ metric, leader }) => ({
              category: metric.category,
              player: leader?.player.name,
              href: leader ? `/players/${leader.player.slug}` : undefined,
              team: leader?.team.abbreviation,
              value: leader ? formatMetric(metric.key, leader.value) : "N/A",
              pct: leader?.percentile
            }))}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="rounded border border-slate-200 bg-white p-4 shadow-sm hover:border-signal">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-signal">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-black text-ink">{tool.label}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{tool.body}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {featuredInsights().map((insight) => (
          <Link key={insight.title} href={insight.href} className="rounded border border-slate-200 bg-white p-4 shadow-sm hover:border-court">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-court">Trending Insight</div>
            <h3 className="font-black text-ink">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{insight.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
