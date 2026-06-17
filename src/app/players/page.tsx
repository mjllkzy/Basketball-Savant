import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn } from "@/components/ui/StatTable";
import { PlayerFilterForm } from "@/components/domain/PlayerFilterForm";
import { listPlayers, players, teams } from "@/lib/data/queries";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { boundedNumber, defaultMinGames, defaultMinMinutes, maxMinGames, maxMinMinutes } from "@/lib/playerFilters";
import { numberParam, singleParam, type RouteSearchParams } from "@/lib/searchParams";

const standardSortMetrics = ["pts", "reb", "ast", "stl", "blk", "tov", "fg_pct", "three_pct", "ft_pct"];
const advancedSortMetrics = ["pie", "ts_pct", "efg_pct", "usage_rate", "ast_pct", "reb_pct", "turnover_rate", "off_rating", "def_rating", "net_rating"];
const primaryPositionOrder = ["PG", "SG", "SF", "PF", "C"];
const standardTableMinWidth = "1440px";
const advancedTableMinWidth = "1580px";

function identityColumn(key: string, label: string, width: string): StatTableColumn {
  return { key, label, width, align: "center" };
}

function metricColumn(key: string, label: string, width = "82px"): StatTableColumn {
  return { key, label, width, align: "right" };
}

const baseColumns: StatTableColumn[] = [
  { key: "player", label: "Player", hrefKey: "href", width: "260px", truncate: true },
  identityColumn("team", "Team", "72px"),
  identityColumn("pos", "Pos", "66px"),
  identityColumn("height", "Height", "82px"),
  identityColumn("weight", "Weight", "86px"),
  identityColumn("age", "Age", "64px"),
  identityColumn("games", "G", "58px"),
  metricColumn("min", "MIN", "74px")
];

const standardColumns: StatTableColumn[] = [
  ...baseColumns,
  metricColumn("pts", "PTS", "74px"),
  metricColumn("reb", "REB", "74px"),
  metricColumn("ast", "AST", "74px"),
  metricColumn("stl", "STL", "70px"),
  metricColumn("blk", "BLK", "70px"),
  metricColumn("tov", "TOV", "70px"),
  metricColumn("fg", "FG%", "82px"),
  metricColumn("three", "3P%", "82px"),
  metricColumn("ft", "FT%", "82px")
];

const advancedColumns: StatTableColumn[] = [
  ...baseColumns,
  metricColumn("ts", "TS%", "82px"),
  metricColumn("efg", "eFG%", "82px"),
  metricColumn("usg", "USG%", "86px"),
  metricColumn("astPct", "AST%", "86px"),
  metricColumn("rebPct", "REB%", "86px"),
  metricColumn("tovPct", "TOV%", "86px"),
  metricColumn("ortg", "ORtg", "78px"),
  metricColumn("drtg", "DRtg", "78px"),
  metricColumn("net", "Net", "74px"),
  metricColumn("pie", "PIE", "78px")
];

export default function PlayersPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const loadedPositions = new Set(players.map((player) => player.position).filter((position) => position && position !== "N/A"));
  const positionOptions = primaryPositionOrder.filter((position) => loadedPositions.has(position));
  const q = singleParam(searchParams, "q");
  const teamId = singleParam(searchParams, "teamId");
  const position = singleParam(searchParams, "position");
  const selectedPosition = positionOptions.includes(position ?? "") ? position : undefined;
  const statView = singleParam(searchParams, "view") === "advanced" ? "advanced" : "standard";
  const sortMetrics = statView === "advanced" ? advancedSortMetrics : standardSortMetrics;
  const defaultSort = statView === "advanced" ? "pie" : "pts";
  const requestedSort = singleParam(searchParams, "sort") ?? defaultSort;
  const sort = sortMetrics.includes(requestedSort) ? requestedSort : defaultSort;
  const minMinutes = boundedNumber(numberParam(searchParams, "minMinutes"), defaultMinMinutes, 0, maxMinMinutes);
  const minGames = boundedNumber(numberParam(searchParams, "minGames"), defaultMinGames, 0, maxMinGames);
  const result = listPlayers({
    q,
    teamId,
    position,
    sort,
    order: (searchParams.order as "asc" | "desc") ?? "desc",
    minGames,
    minMinutes,
    pageSize: 100
  });
  const rows = result.rows.map((row) => ({
    player: row.player.name,
    href: `/players/${row.player.slug}`,
    team: row.team.abbreviation,
    pos: row.player.position,
    height: row.player.height,
    weight: row.player.weight || "N/A",
    age: row.player.age,
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
    ts: formatMetric("ts_pct", calculatePlayerMetric("ts_pct", row)),
    efg: formatMetric("efg_pct", calculatePlayerMetric("efg_pct", row)),
    usg: formatMetric("usage_rate", calculatePlayerMetric("usage_rate", row)),
    astPct: formatMetric("ast_pct", calculatePlayerMetric("ast_pct", row)),
    rebPct: formatMetric("reb_pct", calculatePlayerMetric("reb_pct", row)),
    tovPct: formatMetric("turnover_rate", calculatePlayerMetric("turnover_rate", row)),
    ortg: formatMetric("off_rating", calculatePlayerMetric("off_rating", row)),
    drtg: formatMetric("def_rating", calculatePlayerMetric("def_rating", row)),
    net: formatMetric("net_rating", calculatePlayerMetric("net_rating", row)),
    pie: formatMetric("pie", calculatePlayerMetric("pie", row))
  }));
  const columns = statView === "advanced" ? advancedColumns : standardColumns;
  const tableMinWidth = statView === "advanced" ? advancedTableMinWidth : standardTableMinWidth;

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Player Index" title="Players" description="Sortable official player table with physical profile, volume, efficiency, creation, rebounding, and impact metrics." />
      <PlayerFilterForm
        q={q}
        teamId={teamId}
        position={selectedPosition}
        statView={statView}
        minMinutes={minMinutes}
        minGames={minGames}
        teamOptions={teams.map((team) => ({ label: team.abbreviation, value: team.id }))}
        positionOptions={positionOptions}
      />
      <div className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{result.meta.total}</strong> players with at least <strong className="text-ink">{minMinutes.toLocaleString()}</strong> total minutes and <strong className="text-ink">{minGames}</strong> games played.
      </div>
      <StatTable
        columns={columns}
        rows={rows}
        layout="fixed"
        minWidth={tableMinWidth}
      />
    </div>
  );
}
