import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { PlayerFilterForm } from "@/components/domain/PlayerFilterForm";
import { listPlayers, players, teams } from "@/lib/data/queries";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { boundedNumber, defaultMinGames, defaultMinMinutes, maxMinGames, maxMinMinutes } from "@/lib/playerFilters";
import { numberParam, singleParam, type RouteSearchParams } from "@/lib/searchParams";

const sortMetrics = ["pts", "ts_pct", "efg_pct", "usage_rate", "pie", "reb_pct", "ast_pct", "three_pct", "stocks"];

export default function PlayersPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const positionOptions = Array.from(new Set(players.map((player) => player.position).filter((position) => position && position !== "N/A"))).sort();
  const q = singleParam(searchParams, "q");
  const teamId = singleParam(searchParams, "teamId");
  const position = singleParam(searchParams, "position");
  const sort = singleParam(searchParams, "sort") ?? "pts";
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
    ts: formatMetric("ts_pct", calculatePlayerMetric("ts_pct", row)),
    efg: formatMetric("efg_pct", calculatePlayerMetric("efg_pct", row)),
    usg: formatMetric("usage_rate", calculatePlayerMetric("usage_rate", row)),
    astPct: formatMetric("ast_pct", calculatePlayerMetric("ast_pct", row)),
    rebPct: formatMetric("reb_pct", calculatePlayerMetric("reb_pct", row)),
    pie: formatMetric("pie", calculatePlayerMetric("pie", row)),
    stocks: formatMetric("stocks", calculatePlayerMetric("stocks", row))
  }));

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Player Index" title="Players" description="Sortable official player table with physical profile, volume, efficiency, creation, rebounding, and impact metrics." />
      <PlayerFilterForm
        q={q}
        teamId={teamId}
        position={position}
        sort={sort}
        minMinutes={minMinutes}
        minGames={minGames}
        teamOptions={teams.map((team) => ({ label: team.abbreviation, value: team.id }))}
        positionOptions={positionOptions}
        sortMetrics={sortMetrics}
      />
      <div className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{result.meta.total}</strong> players with at least <strong className="text-ink">{minMinutes.toLocaleString()}</strong> total minutes and <strong className="text-ink">{minGames}</strong> games played.
      </div>
      <StatTable
        columns={[
          { key: "player", label: "Player", hrefKey: "href" },
          { key: "team", label: "Team" },
          { key: "pos", label: "Pos" },
          { key: "size", label: "Ht/Wt" },
          { key: "age", label: "Age", align: "right" },
          { key: "games", label: "G", align: "right" },
          { key: "min", label: "MIN", align: "right" },
          { key: "pts", label: "PTS", align: "right" },
          { key: "reb", label: "REB", align: "right" },
          { key: "ast", label: "AST", align: "right" },
          { key: "ts", label: "TS%", align: "right" },
          { key: "efg", label: "eFG%", align: "right" },
          { key: "usg", label: "USG%", align: "right" },
          { key: "astPct", label: "AST%", align: "right" },
          { key: "rebPct", label: "REB%", align: "right" },
          { key: "pie", label: "PIE", align: "right" },
          { key: "stocks", label: "Stocks", align: "right" }
        ]}
        rows={rows}
      />
    </div>
  );
}
