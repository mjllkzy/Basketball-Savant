import { notFound } from "next/navigation";
import { GameFlowChart } from "@/components/charts/GameFlowChart";
import { ShotChart } from "@/components/charts/ShotChart";
import { GameHeader } from "@/components/domain/GameHeader";
import { LineupTable } from "@/components/domain/LineupTable";
import { PossessionTable } from "@/components/domain/PossessionTable";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatTable } from "@/components/ui/StatTable";
import { getGameAnalytics } from "@/lib/db/gameAnalytics.server";

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const report = await getGameAnalytics(gameId);
  if (!report) notFound();
  const awayCardLabel = report.game.neutralSite ? report.awayTeam.abbreviation : "Away";
  const homeCardLabel = report.game.neutralSite ? report.homeTeam.abbreviation : "Home";
  const topPossessions = [...report.feed].sort((a, b) => Math.abs(b.actualMinusExpected) - Math.abs(a.actualMinusExpected)).slice(0, 10);
  let homeScore = 0;
  let awayScore = 0;
  const flow = report.feed.slice(0, 80).map((possession, index) => {
    if (possession.offenseTeamId === report.game.homeTeamId) homeScore += possession.points;
    else awayScore += possession.points;
    return {
      index,
      label: `${possession.quarter} ${possession.clock}`,
      home: homeScore,
      away: awayScore,
      margin: homeScore - awayScore,
    };
  });
  const boxRows = report.boxScore.map((line) => ({
    player: line.player.name,
    href: `/players/${line.player.slug}`,
    team: line.team.abbreviation,
    min: line.minutes.toFixed(1),
    pts: line.pts,
    reb: line.reb,
    ast: line.ast,
    stl: line.stl,
    blk: line.blk,
    tov: line.tov,
    pm: line.plusMinus
  }));
  const playerNames = Object.fromEntries(report.boxScore.map((line) => [line.player.id, line.player.name]));
  const teamNames = {
    [report.homeTeam.id]: `${report.homeTeam.city} ${report.homeTeam.name}`,
    [report.awayTeam.id]: `${report.awayTeam.city} ${report.awayTeam.name}`,
  };
  return (
    <div className="grid gap-4">
      <GameHeader game={report.game} homeTeam={report.homeTeam} awayTeam={report.awayTeam} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={awayCardLabel} value={report.game.awayScore} sublabel={`${report.awayTeam.city} ${report.awayTeam.name}`} />
        <MetricCard label={homeCardLabel} value={report.game.homeScore} sublabel={`${report.homeTeam.city} ${report.homeTeam.name}`} accent="court" />
        <MetricCard label="Possessions" value={report.feed.length} sublabel="event feed rows" />
        <MetricCard label="Top A-xE" value={topPossessions[0]?.actualMinusExpected.toFixed(2) ?? "N/A"} sublabel={topPossessions[0]?.primaryPlayer.name} accent="ink" />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <GameFlowChart data={flow} />
        <ShotChart shots={report.shots} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div>
          <h2 className="mb-2 text-lg font-black text-ink">Possession Timeline</h2>
          <PossessionTable possessions={report.feed} playerNames={playerNames} teamNames={teamNames} />
        </div>
        <div>
          <h2 className="mb-2 text-lg font-black text-ink">Top 10 Most Valuable Possessions</h2>
          <PossessionTable possessions={topPossessions} playerNames={playerNames} teamNames={teamNames} />
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div>
          <h2 className="mb-2 text-lg font-black text-ink">Player Box Score</h2>
          <StatTable dense columns={[{ key: "player", label: "Player", hrefKey: "href" }, { key: "team", label: "Team" }, { key: "min", label: "MIN", align: "right" }, { key: "pts", label: "PTS", align: "right" }, { key: "reb", label: "REB", align: "right" }, { key: "ast", label: "AST", align: "right" }, { key: "stl", label: "STL", align: "right" }, { key: "blk", label: "BLK", align: "right" }, { key: "tov", label: "TOV", align: "right" }, { key: "pm", label: "+/-", align: "right" }]} rows={boxRows} />
        </div>
        <div>
          <h2 className="mb-2 text-lg font-black text-ink">Lineup Stints</h2>
          <LineupTable lineups={report.lineups} playerNames={playerNames} />
        </div>
      </section>
    </div>
  );
}
