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

const baseColumns: StatTableColumn[] = [
  { key: "player", label: "Player", hrefKey: "href" },
  { key: "team", label: "Team" },
  { key: "pos", label: "Pos" },
  { key: "size", label: "Ht/Wt" },
  { key: "age", label: "Age", align: "right" },
  { key: "games", label: "G", align: "right" },
  { key: "min", label: "MIN", align: "right" }
];

const standardColumns: StatTableColumn[] = [
  ...baseColumns,
  { key: "pts", label: "PTS", align: "right" },
  { key: "reb", label: "REB", align: "right" },
  { key: "ast", label: "AST", align: "right" },
  { key: "stl", label: "STL", align: "right" },
  { key: "blk", label: "BLK", align: "right" },
  { key: "tov", label: "TOV", align: "right" },
  { key: "fg", label: "FG%", align: "right" },
  { key: "three", label: "3P%", align: "right" },
  { key: "ft", label: "FT%", align: "right" }
];

const advancedColumns: StatTableColumn[] = [
  ...baseColumns,
  { key: "ts", label: "TS%", align: "right" },
  { key: "efg", label: "eFG%", align: "right" },
  { key: "usg", label: "USG%", align: "right" },
  { key: "astPct", label: "AST%", align: "right" },
  { key: "rebPct", label: "REB%", align: "right" },
  { key: "tovPct", label: "TOV%", align: "right" },
  { key: "ortg", label: "ORtg", align: "right" },
  { key: "drtg", label: "DRtg", align: "right" },
  { key: "net", label: "Net", align: "right" },
  { key: "pie", label: "PIE", align: "right" }
];

export default function PlayersPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const positionOptions = Array.from(new Set(players.map((player) => player.position).filter((position) => position && position !== "N/A"))).sort();
  const q = singleParam(searchParams, "q");
  const teamId = singleParam(searchParams, "teamId");
  const position = singleParam(searchParams, "position");
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
    size: `${row.player.height} / ${row.player.weight || "N/A"}`,
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

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Player Index" title="Players" description="Sortable official player table with physical profile, volume, efficiency, creation, rebounding, and impact metrics." />
      <PlayerFilterForm
        q={q}
        teamId={teamId}
        position={position}
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
      />
    </div>
  );
}
