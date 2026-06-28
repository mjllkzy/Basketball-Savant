import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { gameContextLabel, gameMatchupLabel, listGameAnalytics } from "@/lib/db/gameAnalytics.server";
import { formatShortDate } from "@/lib/date";

export default async function GamesPage() {
  const result = await listGameAnalytics({ pageSize: 100 });
  const rows = result.rows.map((item) => {
    const leadingScorer = item.leadingScorer;
    return {
      date: formatShortDate(item.game.date),
      matchup: gameMatchupLabel(item),
      href: `/games/${item.game.id}`,
      score: `${item.game.awayScore}-${item.game.homeScore}`,
      context: gameContextLabel(item),
      leadingScorer: leadingScorer ? `${leadingScorer.player.name} · ${leadingScorer.team.abbreviation} · ${leadingScorer.points} PTS` : null,
      leadingScorerHref: leadingScorer ? `/players/${leadingScorer.player.slug}` : undefined
    };
  });
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Game Index" title="Games" description="Official game-log scores, box scores, possession feeds, shot charts, lineups, and run charts when those feeds are loaded." />
      {rows.length ? (
        <StatTable columns={[{ key: "date", label: "Date" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "context", label: "Context" }, { key: "leadingScorer", label: "Leading Scorer", hrefKey: "leadingScorerHref" }]} rows={rows} />
      ) : (
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
          Official game-log rows are not loaded in the current NBA Stats snapshot, so ShotClock is hiding game scores and dates rather than fabricating them.
        </div>
      )}
    </div>
  );
}
