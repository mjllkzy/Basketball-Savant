import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn } from "@/components/ui/StatTable";
import { PlayerFilterForm } from "@/components/domain/PlayerFilterForm";
import { officialTeams } from "@/lib/data/official";
import { listPlayerDirectory, loadPlayerDirectoryFilters } from "@/lib/db/playerDirectory.server";
import { formatMetric } from "@/lib/metrics/format";
import { boundedNumber, defaultMinGames, defaultMinMinutes, maxMinGames, maxMinMinutes } from "@/lib/playerFilters";
import { booleanParam, numberParam, singleParam, type RouteSearchParams } from "@/lib/searchParams";

const standardSortMetrics = ["pts", "reb", "ast", "stl", "blk", "tov", "fg_pct", "three_pct", "ft_pct"];
const advancedSortMetrics = ["pie", "ts_pct", "efg_pct", "usage_rate", "ast_pct", "reb_pct", "turnover_rate", "off_rating", "def_rating", "net_rating"];
const primaryPositionOrder = ["PG", "SG", "SF", "PF", "C"];
const standardTableMinWidth = "1500px";
const advancedTableMinWidth = "1580px";
const teamPrimaryColorByAbbreviation = new Map(officialTeams.map((team) => [team.abbreviation, team.primaryColor]));

export const metadata: Metadata = {
  title: "NBA Players",
  description: "Explore sortable 2025-26 NBA player statistics, advanced metrics, physical profiles, and impact data.",
  alternates: { canonical: "/players" },
};

function identityColumn(key: string, label: string, width: string, sortOrder?: string[]): StatTableColumn {
  return { key, label, width, align: "center", sortOrder };
}

function metricColumn(key: string, label: string, width = "82px"): StatTableColumn {
  return { key, label, width, align: "center" };
}

const baseColumns: StatTableColumn[] = [
  { key: "player", label: "Player", hrefKey: "href", width: "260px", truncate: true },
  identityColumn("team", "Team", "72px"),
  identityColumn("pos", "Pos", "66px", primaryPositionOrder),
  identityColumn("height", "Height", "82px"),
  identityColumn("weight", "Weight", "86px"),
  identityColumn("age", "Age", "64px"),
  identityColumn("games", "G", "58px"),
  metricColumn("min", "MIN", "74px")
];

const standardColumns: StatTableColumn[] = [
  ...baseColumns,
  metricColumn("pts", "PTS"),
  metricColumn("reb", "REB"),
  metricColumn("ast", "AST"),
  metricColumn("stl", "STL"),
  metricColumn("blk", "BLK"),
  metricColumn("tov", "TOV"),
  metricColumn("fg", "FG%", "82px"),
  metricColumn("three", "3P%", "82px"),
  metricColumn("ft", "FT%", "82px")
];

const advancedColumns: StatTableColumn[] = [
  ...baseColumns,
  metricColumn("ts", "TS%", "82px"),
  metricColumn("efg", "eFG%", "82px"),
  metricColumn("usg", "USG%", "82px"),
  metricColumn("astPct", "AST%", "82px"),
  metricColumn("rebPct", "REB%", "82px"),
  metricColumn("tovPct", "TOV%", "82px"),
  metricColumn("ortg", "ORtg", "82px"),
  metricColumn("drtg", "DRtg", "82px"),
  metricColumn("net", "Net", "82px"),
  metricColumn("pie", "PIE", "82px")
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

export default async function PlayersPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const q = singleParam(resolvedSearchParams, "q");
  const teamId = singleParam(resolvedSearchParams, "teamId");
  const position = singleParam(resolvedSearchParams, "position");
  const statView = singleParam(resolvedSearchParams, "view") === "advanced" ? "advanced" : "standard";
  const sortMetrics = statView === "advanced" ? advancedSortMetrics : standardSortMetrics;
  const defaultSort = statView === "advanced" ? "pie" : "pts";
  const requestedSort = singleParam(resolvedSearchParams, "sort") ?? defaultSort;
  const sort = sortMetrics.includes(requestedSort) ? requestedSort : defaultSort;
  const minMinutes = boundedNumber(numberParam(resolvedSearchParams, "minMinutes"), defaultMinMinutes, 0, maxMinMinutes);
  const minGames = boundedNumber(numberParam(resolvedSearchParams, "minGames"), defaultMinGames, 0, maxMinGames);
  const showAll = booleanParam(resolvedSearchParams, "showAll") === true;
  const order = singleParam(resolvedSearchParams, "order") === "asc" ? "asc" : "desc";
  const [filterOptions, result] = await Promise.all([
    loadPlayerDirectoryFilters(),
    listPlayerDirectory({
      q,
      teamId,
      position,
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
    href: `/players/${row.playerSlug}`,
    team: row.teamAbbreviation,
    teamAccent: teamPrimaryColorByAbbreviation.get(row.teamAbbreviation) ?? "#0f766e",
    pos: row.position,
    height: row.height,
    weight: row.weight || "N/A",
    age: row.age ?? "N/A",
    games: row.games,
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
        minMinutes={minMinutes}
        minGames={minGames}
        teamOptions={filterOptions.teams}
        positionOptions={positionOptions}
      />
      <div data-data-source={result.meta.source} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{result.meta.total}</strong> players with at least <strong className="text-ink">{minMinutes.toLocaleString()}</strong> total minutes and <strong className="text-ink">{minGames}</strong> games played.
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
