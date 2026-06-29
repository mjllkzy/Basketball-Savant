import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamShotMap } from "@/components/charts/TeamShotMap";
import { TeamStyleProfile } from "@/components/charts/TeamStyleProfile";
import { TeamHeader } from "@/components/domain/TeamHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatTable } from "@/components/ui/StatTable";
import { gameMatchupLabel } from "@/lib/db/gameAnalytics.server";
import { listTeamSeasonSummaries, loadTeamProfile } from "@/lib/db/teamAnalytics.server";
import { formatShortDate } from "@/lib/date";
import { calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { parseSeasonType } from "@/lib/seasonTypes";
import { DEFAULT_SEASON, parseSeason } from "@/lib/seasons";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

function playerHref(slug: string, season: string, seasonType: string) {
  const params = new URLSearchParams();
  if (season !== DEFAULT_SEASON) params.set("season", season);
  if (seasonType !== "Regular Season") params.set("seasonType", seasonType);
  const query = params.toString();
  return query ? `/players/${slug}?${query}` : `/players/${slug}`;
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const { teamId } = await params;
  const profile = await loadTeamProfile(teamId);
  if (!profile) return { title: "Team Not Found", robots: { index: false, follow: false } };

  const teamName = `${profile.team.city} ${profile.team.name}`.trim();
  const title = `${teamName} Stats`;
  const description = `${teamName} 2025-26 team ratings, shooting profile, roster statistics, and game logs.`;
  return {
    title,
    description,
    alternates: { canonical: `/teams/${profile.team.slug}` },
    openGraph: {
      title,
      description,
      url: `/teams/${profile.team.slug}`,
    },
  };
}

export default async function TeamPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<RouteSearchParams> }) {
  const [{ teamId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const season = parseSeason(singleParam(resolvedSearchParams, "season"));
  const seasonType = parseSeasonType(singleParam(resolvedSearchParams, "seasonType"));
  const [profile, teamSummaries] = await Promise.all([
    loadTeamProfile(teamId, seasonType, season),
    listTeamSeasonSummaries({ season, seasonType }),
  ]);
  if (!profile) notFound();
  const rosterRows = profile.rosterRows.map((row) => ({
    player: row.playerName,
    href: playerHref(row.playerSlug, season, seasonType),
    pos: row.position,
    games: row.games,
    min: row.minutesPerGame === null ? "N/A" : row.minutesPerGame.toFixed(1),
    pts: formatMetric("pts", row.pts),
    reb: formatMetric("reb", row.reb),
    ast: formatMetric("ast", row.ast),
    stl: formatMetric("stl", row.stl),
    blk: formatMetric("blk", row.blk),
    tov: formatMetric("tov", row.tov),
    fg: formatMetric("fg_pct", row.fgPct),
    three: formatMetric("three_pct", row.threePct),
    ft: formatMetric("ft_pct", row.ftPct),
    ts: formatMetric("ts_pct", row.tsPct)
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
        <TeamShotMap shots={profile.shots} maxShots={260} />
      </section>
      <section className="grid gap-4">
        <TeamStyleProfile team={profile.aggregate} teams={teamSummaries.rows} />
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
          <StatTable dense columns={[{ key: "date", label: "Date" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "result", label: "Result" }]} rows={profile.games.map((item) => ({ date: formatShortDate(item.game.date), matchup: gameMatchupLabel(item), href: `/games/${item.game.id}`, score: `${item.game.awayScore}-${item.game.homeScore}`, result: item.game.homeTeamId === profile.team.id ? (item.game.homeScore > item.game.awayScore ? "W" : "L") : (item.game.awayScore > item.game.homeScore ? "W" : "L") }))} />
        ) : (
          <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
            Official team game logs are not loaded in this snapshot.
          </div>
        )}
      </div>
    </div>
  );
}
