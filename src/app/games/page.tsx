import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { listGames, teamName } from "@/lib/data/queries";

export default function GamesPage() {
  const result = listGames({ pageSize: 100 });
  const rows = result.rows.map((game) => ({
    date: game.date,
    matchup: `${teamName(game.awayTeamId)} at ${teamName(game.homeTeamId)}`,
    href: `/games/${game.id}`,
    score: `${game.awayScore}-${game.homeScore}`,
    status: game.status,
    arena: game.arena
  }));
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Game Index" title="Games" description="Seeded games with score headers, box scores, possession feeds, shot charts, lineups, and run charts." />
      <StatTable columns={[{ key: "date", label: "Date" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "status", label: "Status" }, { key: "arena", label: "Arena" }]} rows={rows} />
    </div>
  );
}
