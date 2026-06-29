import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn } from "@/components/ui/StatTable";
import { PlayerFilterForm } from "@/components/domain/PlayerFilterForm";
import { officialTeams } from "@/lib/data/official";
import { listPlayerDirectory, loadPlayerDirectoryFilters } from "@/lib/db/playerDirectory.server";
import { formatMetric } from "@/lib/metrics/format";
import { formatPlayerHeight } from "@/lib/playerHeight";
import { boundedNumber, defaultMinGames, defaultMinMinutes, maxMinGames, maxMinMinutes } from "@/lib/playerFilters";
import { parseSeasonType } from "@/lib/seasonTypes";
import { DEFAULT_SEASON, parseSeason } from "@/lib/seasons";
import { booleanParam, numberParam, singleParam, type RouteSearchParams } from "@/lib/searchParams";

const standardSortMetrics = ["pts", "reb", "ast", "stl", "blk", "tov", "fg_pct", "three_pct", "ft_pct"];
const advancedSortMetrics = ["pie", "ts_pct", "efg_pct", "usage_rate", "ast_pct", "reb_pct", "turnover_rate", "off_rating", "def_rating", "net_rating"];
const primaryPositionOrder = ["PG", "SG", "SF", "PF", "C"];
const entityColumnWidth = "290px";
const secondaryColumnWidth = "86px";
const standardTableMinWidth = "1752px";
const advancedTableMinWidth = "1838px";
const teamPrimaryColorByAbbreviation = new Map(officialTeams.map((team) => [team.abbreviation, team.primaryColor]));

export const metadata: Metadata = {
  title: "NBA Players",
  description: "Explore sortable 2025-26 NBA player statistics, advanced metrics, physical profiles, and impact data.",
  alternates: { canonical: "/players" },
};

function identityColumn(key: string, label: string, width: string, group: string, sortOrder?: string[]): StatTableColumn {
  return { key, label, width, group, align: "center", sortOrder };
}

function metricColumn(key: string, label: string, group: string, width = secondaryColumnWidth): StatTableColumn {
  return { key, label, width, group, align: "center" };
}

const baseColumns: StatTableColumn[] = [
  { key: "player", label: "Player", group: "Profile", hrefKey: "href", width: entityColumnWidth, truncate: true },
  identityColumn("team", "Team", secondaryColumnWidth, "Profile"),
  identityColumn("pos", "Pos", secondaryColumnWidth, "Profile", primaryPositionOrder),
  identityColumn("height", "Height", secondaryColumnWidth, "Profile"),
  identityColumn("weight", "Weight", secondaryColumnWidth, "Profile"),
  identityColumn("age", "Age", secondaryColumnWidth, "Profile"),
  identityColumn("games", "G", secondaryColumnWidth, "Availability"),
  identityColumn("gamesStarted", "GS", secondaryColumnWidth, "Availability"),
  metricColumn("min", "MIN", "Availability")
];

const standardColumns: StatTableColumn[] = [
  ...baseColumns,
  metricColumn("pts", "PTS", "Production"),
  metricColumn("reb", "REB", "Production"),
  metricColumn("ast", "AST", "Production"),
  metricColumn("stl", "STL", "Defense"),
  metricColumn("blk", "BLK", "Defense"),
  metricColumn("tov", "TOV", "Ball Security"),
  metricColumn("fg", "FG%", "Efficiency"),
  metricColumn("three", "3P%", "Efficiency"),
  metricColumn("ft", "FT%", "Efficiency")
];

const advancedColumns: StatTableColumn[] = [
  ...baseColumns,
  metricColumn("ts", "TS%", "Efficiency"),
  metricColumn("efg", "eFG%", "Efficiency"),
  metricColumn("usg", "USG%", "Creation"),
  metricColumn("astPct", "AST%", "Creation"),
  metricColumn("rebPct", "REB%", "Rebounding"),
  metricColumn("tovPct", "TOV%", "Ball Security"),
  metricColumn("ortg", "ORtg", "Impact"),
  metricColumn("drtg", "DRtg", "Impact"),
  metricColumn("net", "Net", "Impact"),
  metricColumn("pie", "PIE", "Impact")
];

function playersHref(searchParams: RouteSearchParams, showAll: boolean) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "showAll") return;
    const current = Array.isArray(value) ? value[0] : value;
    if (current) params.set(key, current);
  });
  if (showAll) params.set("showAll", "true");
  const query = params.toString();
  return query ? `/players?${query}` : "/players";
}

function playerHref(slug: string, seasonType: string, season: string) {
  const params = new URLSearchParams();
  if (season !== DEFAULT_SEASON) params.set("season", season);
  if (seasonType !== "Regular Season") params.set("seasonType", seasonType);
  const query = params.toString();
  return query ? `/players/${slug}?${query}` : `/players/${slug}`;
}

function formatPlayerAge(age: number | null) {
  return age === null ? "N/A" : age.toFixed(1);
}

export default async function PlayersPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const q = singleParam(resolvedSearchParams, "q");
  const teamId = singleParam(resolvedSearchParams, "teamId");
  const position = singleParam(resolvedSearchParams, "position");
  const statView = singleParam(resolvedSearchParams, "view") === "advanced" ? "advanced" : "standard";
  const season = parseSeason(singleParam(resolvedSearchParams, "season"));
  const seasonType = parseSeasonType(singleParam(resolvedSearchParams, "seasonType"));
  const sortMetrics = statView === "advanced" ? advancedSortMetrics : standardSortMetrics;
  const defaultSort = statView === "advanced" ? "pie" : "pts";
  const requestedSort = singleParam(resolvedSearchParams, "sort") ?? defaultSort;
  const sort = sortMetrics.includes(requestedSort) ? requestedSort : defaultSort;
  const minMinutes = boundedNumber(numberParam(resolvedSearchParams, "minMinutes"), defaultMinMinutes, 0, maxMinMinutes);
  const minGames = boundedNumber(numberParam(resolvedSearchParams, "minGames"), defaultMinGames, 0, maxMinGames);
  const showAll = booleanParam(resolvedSearchParams, "showAll") === true;
  const order = singleParam(resolvedSearchParams, "order") === "asc" ? "asc" : "desc";
  const [filterOptions, result] = await Promise.all([
    loadPlayerDirectoryFilters(seasonType, season),
    listPlayerDirectory({
      q,
      teamId,
      position,
      season,
      seasonType,
      sort,
      order,
      minGames,
      minMinutes,
      pageSize: 100,
      all: showAll
    }),
  ]);
  const loadedPositions = new Set(filterOptions.positions);
  const positionOptions = primaryPositionOrder.filter((loadedPosition) => loadedPositions.has(loadedPosition));
  const selectedPosition = positionOptions.includes(position ?? "") ? position : undefined;
  const rows = result.rows.map((row) => ({
    player: row.playerName,
    href: playerHref(row.playerSlug, seasonType, season),
    team: row.teamAbbreviation,
    teamAccent: teamPrimaryColorByAbbreviation.get(row.teamAbbreviation) ?? "#0f766e",
    pos: row.position,
    height: formatPlayerHeight(row.height),
    weight: row.weight || "N/A",
    age: formatPlayerAge(row.age),
    games: row.games,
    gamesStarted: row.gamesStarted ?? "N/A",
    min: row.minutesPerGame?.toFixed(1) ?? "N/A",
    pts: formatMetric("pts", row.pts),
    reb: formatMetric("reb", row.reb),
    ast: formatMetric("ast", row.ast),
    stl: formatMetric("stl", row.stl),
    blk: formatMetric("blk", row.blk),
    tov: formatMetric("tov", row.tov),
    fg: formatMetric("fg_pct", row.fgPct),
    three: formatMetric("three_pct", row.threePct),
    ft: formatMetric("ft_pct", row.ftPct),
    ts: formatMetric("ts_pct", row.tsPct),
    efg: formatMetric("efg_pct", row.efgPct),
    usg: formatMetric("usage_rate", row.usageRate),
    astPct: formatMetric("ast_pct", row.astPct),
    rebPct: formatMetric("reb_pct", row.rebPct),
    tovPct: formatMetric("turnover_rate", row.turnoverRate),
    ortg: formatMetric("off_rating", row.offRating),
    drtg: formatMetric("def_rating", row.defRating),
    net: formatMetric("net_rating", row.netRating),
    pie: formatMetric("pie", row.pie)
  }));
  const columns = statView === "advanced" ? advancedColumns : standardColumns;
  const tableMinWidth = statView === "advanced" ? advancedTableMinWidth : standardTableMinWidth;

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Player Index" title="Players" description="Sortable masterfile-backed player table with physical profile, volume, efficiency, creation, rebounding, and impact metrics." />
      <PlayerFilterForm
        q={q}
        teamId={teamId}
        position={selectedPosition}
        statView={statView}
        season={season}
        seasonType={seasonType}
        minMinutes={minMinutes}
        minGames={minGames}
        seasons={filterOptions.seasons}
        seasonTypes={filterOptions.seasonTypes}
        teamOptions={filterOptions.teams}
        positionOptions={positionOptions}
      />
      <div data-data-source={result.meta.source} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{result.meta.total}</strong> {season} {seasonType.toLowerCase()} players with at least <strong className="text-ink">{minMinutes.toLocaleString()}</strong> total minutes and <strong className="text-ink">{minGames}</strong> games played.
      </div>
      <StatTable
        columns={columns}
        rows={rows}
        layout="fixed"
        minWidth={tableMinWidth}
        rowAccentColorKey="teamAccent"
        rowAccentColumnKey="player"
      />
      <div className="flex flex-col items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row">
        <span>
          Displaying <strong className="text-ink">{rows.length}</strong> of <strong className="text-ink">{result.meta.total}</strong> matching players.
        </span>
        {showAll ? (
          <Link href={playersHref(resolvedSearchParams, false)} className="inline-flex min-h-10 items-center justify-center rounded border border-slate-300 px-4 text-sm font-black text-ink hover:bg-slate-50">
            Show first 100
          </Link>
        ) : (
          <Link href={playersHref(resolvedSearchParams, true)} className="inline-flex min-h-10 items-center justify-center rounded bg-ink px-4 text-sm font-black text-white hover:bg-slate-800">
            Show all rows
          </Link>
        )}
      </div>
    </div>
  );
}
