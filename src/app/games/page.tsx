import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { gameMatchupLabel, getGameLeadingScorer, listGames } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";

export default function GamesPage() {
  const result = listGames({ pageSize: 100 });
  const rows = result.rows.map((game) => {
    const leadingScorer = getGameLeadingScorer(game.id);
    return {
      date: formatShortDate(game.date),
      matchup: gameMatchupLabel(game),
      href: `/games/${game.id}`,
      score: `${game.awayScore}-${game.homeScore}`,
      status: game.status,
      leadingScorer: leadingScorer ? `${leadingScorer.player.name} · ${leadingScorer.team.abbreviation} · ${leadingScorer.points} PTS` : null,
      leadingScorerHref: leadingScorer ? `/players/${leadingScorer.player.slug}` : undefined
    };
  });
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Game Index" title="Games" description="Official game-log scores, box scores, possession feeds, shot charts, lineups, and run charts when those feeds are loaded." />
      {rows.length ? (
        <StatTable columns={[{ key: "date", label: "Date" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "status", label: "Status" }, { key: "leadingScorer", label: "Leading Scorer", hrefKey: "leadingScorerHref" }]} rows={rows} />
      ) : (
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
          Official game-log rows are not loaded in the current NBA Stats snapshot, so Basketball Savant is hiding game scores and dates rather than fabricating them.
        </div>
      )}
    </div>
  );
}
