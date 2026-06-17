import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { listPlayers, players, teams } from "@/lib/data/queries";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

const sortMetrics = ["pts", "ts_pct", "efg_pct", "usage_rate", "pie", "reb_pct", "ast_pct", "three_pct", "stocks"];

export default function PlayersPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const positionOptions = Array.from(new Set(players.map((player) => player.position).filter((position) => position && position !== "N/A"))).sort();
  const result = listPlayers({
    q: searchParams.q,
    teamId: searchParams.teamId,
    position: searchParams.position,
    sort: searchParams.sort ?? "pts",
    order: (searchParams.order as "asc" | "desc") ?? "desc",
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
      <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-5">
        <input name="q" defaultValue={searchParams.q} placeholder="Search player" className="rounded border border-slate-300 px-3 py-2 text-sm" />
        <select name="teamId" defaultValue={searchParams.teamId ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All teams</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.abbreviation}</option>)}
        </select>
        <select name="position" defaultValue={searchParams.position ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All positions</option>
          {positionOptions.map((position) => <option key={position}>{position}</option>)}
        </select>
        <select name="sort" defaultValue={searchParams.sort ?? "pts"} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {sortMetrics.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
        </select>
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Apply</button>
      </form>
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
