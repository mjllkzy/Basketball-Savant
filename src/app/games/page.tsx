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
      <PageHeader eyebrow="Game Index" title="Games" description="Official game-log scores, box scores, possession feeds, shot charts, lineups, and run charts when those feeds are loaded." />
      {rows.length ? (
        <StatTable columns={[{ key: "date", label: "Date" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "status", label: "Status" }, { key: "arena", label: "Arena" }]} rows={rows} />
      ) : (
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
          Official game-log rows are not loaded in the current NBA Stats snapshot, so Basketball Savant is hiding game scores and dates rather than fabricating them.
        </div>
      )}
    </div>
  );
}
