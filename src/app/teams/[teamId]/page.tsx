import { notFound } from "next/navigation";
import { LineupNetwork } from "@/components/charts/LineupNetwork";
import { TeamShotMap } from "@/components/charts/TeamShotMap";
import { TeamStyleProfile } from "@/components/charts/TeamStyleProfile";
import { LineupTable } from "@/components/domain/LineupTable";
import { TeamHeader } from "@/components/domain/TeamHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatTable } from "@/components/ui/StatTable";
import { getLiveTeamShotChart } from "@/lib/data/liveShotCharts";
import { gameMatchupLabel, getTeamProfile, players, teamSeasonAggregates } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
import { calculatePlayerMetric, calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

export default async function TeamPage({ params }: { params: { teamId: string } }) {
  const profile = getTeamProfile(params.teamId);
  if (!profile) notFound();
  const liveShots = await getLiveTeamShotChart(profile.team.id);
  const chartShots = liveShots.length ? liveShots : profile.shots;
  const rosterRows = profile.rosterRows.map((row) => ({
    player: row.player.name,
    href: `/players/${row.player.slug}`,
    pos: row.player.position,
    pts: formatMetric("pts", calculatePlayerMetric("pts", row)),
    ts: formatMetric("ts_pct", calculatePlayerMetric("ts_pct", row)),
    usg: formatMetric("usage_rate", calculatePlayerMetric("usage_rate", row)),
    stocks: formatMetric("stocks", calculatePlayerMetric("stocks", row))
  }));
  return (
    <div className="grid gap-4">
      <TeamHeader team={profile.team} record={`${profile.aggregate.wins}-${profile.aggregate.losses}`} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {["off_rating", "def_rating", "net_rating", "pace", "efg_pct", "three_pct"].map((key, index) => (
          <MetricCard key={key} label={key.replaceAll("_", " ").toUpperCase()} value={formatMetric(key, calculateTeamMetric(key, profile.aggregate))} accent={index % 2 ? "court" : "signal"} />
        ))}
      </section>
      <section>
        <TeamShotMap shots={chartShots} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <TeamStyleProfile team={profile.aggregate} teams={teamSeasonAggregates} />
        <LineupNetwork lineups={profile.lineups} players={players} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <h2 className="mb-2 text-lg font-black text-ink">Roster</h2>
          <StatTable dense columns={[{ key: "player", label: "Player", hrefKey: "href" }, { key: "pos", label: "Pos" }, { key: "pts", label: "PTS", align: "right" }, { key: "ts", label: "TS%", align: "right" }, { key: "usg", label: "USG%", align: "right" }, { key: "stocks", label: "Stocks", align: "right" }]} rows={rosterRows} />
        </div>
        <div>
          <h2 className="mb-2 text-lg font-black text-ink">Lineups</h2>
          <LineupTable lineups={profile.lineups} />
        </div>
      </section>
      <div>
        <h2 className="mb-2 text-lg font-black text-ink">Game Logs</h2>
        {profile.games.length ? (
          <StatTable dense columns={[{ key: "date", label: "Date" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "result", label: "Result" }]} rows={profile.games.map((game) => ({ date: formatShortDate(game.date), matchup: gameMatchupLabel(game), href: `/games/${game.id}`, score: `${game.awayScore}-${game.homeScore}`, result: game.homeTeamId === profile.team.id ? (game.homeScore > game.awayScore ? "W" : "L") : (game.awayScore > game.homeScore ? "W" : "L") }))} />
        ) : (
          <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
            Official team game logs are not loaded in this snapshot.
          </div>
        )}
      </div>
    </div>
  );
}
