import { notFound } from "next/navigation";
import { PercentileRadar } from "@/components/charts/PercentileRadar";
import { RollingLineChart } from "@/components/charts/RollingLineChart";
import { ShotChart } from "@/components/charts/ShotChart";
import { LineupNetwork } from "@/components/charts/LineupNetwork";
import { PlayerHeader } from "@/components/domain/PlayerHeader";
import { PlayerSnapshot } from "@/components/domain/PlayerSnapshot";
import { PlayTypeBreakdown } from "@/components/domain/PlayTypeBreakdown";
import { ShotProfileTable } from "@/components/domain/ShotProfileTable";
import { SimilarPlayersTable } from "@/components/domain/SimilarPlayersTable";
import { StatTable } from "@/components/ui/StatTable";
import { PercentileBar } from "@/components/ui/PercentileBar";
import { getPlayerProfile, lineups, players } from "@/lib/data/queries";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

export default function PlayerPage({ params }: { params: { playerId: string } }) {
  const profile = getPlayerProfile(params.playerId);
  if (!profile) notFound();
  const radarKeys = ["pts", "reb", "ast", "ts_pct", "usage_rate", "three_pct", "stocks"];
  const radarData = radarKeys.map((key) => ({
    metric: getMetric(key).shortLabel,
    percentile: profile.metricValues.find((value) => value.metricKey === key)?.percentile ?? 0
  }));
  const gameRows = profile.gameLog.map((line) => ({
    date: line.game.date,
    game: `${line.opponent.abbreviation}`,
    pts: line.pts,
    reb: line.reb,
    ast: line.ast,
    stl: line.stl,
    blk: line.blk,
    tov: line.tov,
    ts: `${Math.round((line.pts / (2 * (line.fga + 0.44 * line.fta))) * 100)}%`,
    pm: line.plusMinus
  }));
  const playerLineups = lineups.filter((lineup) => [lineup.player1Id, lineup.player2Id, lineup.player3Id, lineup.player4Id, lineup.player5Id].includes(profile.player.id));

  return (
    <div className="grid gap-4">
      <PlayerHeader player={profile.player} team={profile.team} />
      <PlayerSnapshot aggregate={profile.aggregate} />
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PercentileRadar data={radarData} />
        <RollingLineChart data={profile.aggregate.recentGameScores.map((row) => ({ date: row.date.slice(5), pts: row.pts, ts: Math.round(row.ts * 100), usage: Math.round(row.usage * 100), net: row.net }))} lines={["pts", "net"]} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <ShotChart shots={profile.shots} colorBy="xpts" />
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-ink">Role Profile</h2>
          <div className="grid gap-3">
            {radarKeys.map((key) => <PercentileBar key={key} label={getMetric(key).label} value={profile.metricValues.find((value) => value.metricKey === key)?.percentile ?? 0} />)}
          </div>
          <div className="mt-4 rounded bg-slate-100 p-3 text-sm leading-6 text-slate-600">
            {profile.player.name} is shown from an official NBA Stats snapshot. Box-score and Basketball-Reference-style derived metrics are live; tracking-only measures are marked N/A until a licensed event/tracking source is connected.
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <ShotProfileTable aggregate={profile.aggregate} />
        <PlayTypeBreakdown aggregate={profile.aggregate} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <StatTable dense columns={[{ key: "date", label: "Date" }, { key: "game", label: "Opp" }, { key: "pts", label: "PTS", align: "right" }, { key: "reb", label: "REB", align: "right" }, { key: "ast", label: "AST", align: "right" }, { key: "stl", label: "STL", align: "right" }, { key: "blk", label: "BLK", align: "right" }, { key: "tov", label: "TOV", align: "right" }, { key: "ts", label: "TS", align: "right" }, { key: "pm", label: "+/-", align: "right" }]} rows={gameRows} />
        <SimilarPlayersTable playerId={profile.player.id} />
      </section>
      <LineupNetwork lineups={playerLineups} players={players} />
    </div>
  );
}
