import { notFound } from "next/navigation";
import { LineupNetwork } from "@/components/charts/LineupNetwork";
import { TeamShotMap } from "@/components/charts/TeamShotMap";
import { TeamStyleProfile } from "@/components/charts/TeamStyleProfile";
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
    games: row.games,
    min: (row.minutes / Math.max(row.games, 1)).toFixed(1),
    pts: formatMetric("pts", calculatePlayerMetric("pts", row)),
    reb: formatMetric("reb", calculatePlayerMetric("reb", row)),
    ast: formatMetric("ast", calculatePlayerMetric("ast", row)),
    stl: formatMetric("stl", calculatePlayerMetric("stl", row)),
    blk: formatMetric("blk", calculatePlayerMetric("blk", row)),
    tov: formatMetric("tov", calculatePlayerMetric("tov", row)),
    fg: formatMetric("fg_pct", calculatePlayerMetric("fg_pct", row)),
    three: formatMetric("three_pct", calculatePlayerMetric("three_pct", row)),
    ft: formatMetric("ft_pct", calculatePlayerMetric("ft_pct", row)),
    ts: formatMetric("ts_pct", calculatePlayerMetric("ts_pct", row))
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
      <section className={`grid gap-4 ${profile.lineups.length ? "xl:grid-cols-2" : ""}`}>
        <TeamStyleProfile team={profile.aggregate} teams={teamSeasonAggregates} />
        {profile.lineups.length ? <LineupNetwork lineups={profile.lineups} players={players} /> : null}
      </section>
      <div>
        <h2 className="mb-2 text-lg font-black text-ink">Roster</h2>
        <StatTable
          dense
          minWidth="1120px"
          columns={[
            { key: "player", label: "Player", hrefKey: "href", width: "220px", truncate: true },
            { key: "pos", label: "Pos", align: "center", width: "64px" },
            { key: "games", label: "G", align: "right", width: "56px" },
            { key: "min", label: "MIN", align: "right", width: "70px" },
            { key: "pts", label: "PTS", align: "right", width: "70px" },
            { key: "reb", label: "REB", align: "right", width: "70px" },
            { key: "ast", label: "AST", align: "right", width: "70px" },
            { key: "stl", label: "STL", align: "right", width: "70px" },
            { key: "blk", label: "BLK", align: "right", width: "70px" },
            { key: "tov", label: "TOV", align: "right", width: "70px" },
            { key: "fg", label: "FG%", align: "right", width: "76px" },
            { key: "three", label: "3P%", align: "right", width: "76px" },
            { key: "ft", label: "FT%", align: "right", width: "76px" },
            { key: "ts", label: "TS%", align: "right", width: "76px" }
          ]}
          rows={rosterRows}
        />
      </div>
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
