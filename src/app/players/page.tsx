import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { listPlayers, teams } from "@/lib/data/queries";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

export default function PlayersPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
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
    role: row.player.role,
    games: row.games,
    min: (row.minutes / row.games).toFixed(1),
    pts: formatMetric("pts", calculatePlayerMetric("pts", row)),
    ts: formatMetric("ts_pct", calculatePlayerMetric("ts_pct", row)),
    usg: formatMetric("usage_rate", calculatePlayerMetric("usage_rate", row)),
    ast: formatMetric("ast", calculatePlayerMetric("ast", row)),
    stocks: formatMetric("stocks", calculatePlayerMetric("stocks", row))
  }));

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Player Index" title="Players" description="Sortable player table with team, role, volume, efficiency, creation, and impact metrics." />
      <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-5">
        <input name="q" defaultValue={searchParams.q} placeholder="Search player" className="rounded border border-slate-300 px-3 py-2 text-sm" />
        <select name="teamId" defaultValue={searchParams.teamId ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All teams</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.abbreviation}</option>)}
        </select>
        <select name="position" defaultValue={searchParams.position ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All positions</option>
          {["PG", "SG", "SF", "PF", "C"].map((position) => <option key={position}>{position}</option>)}
        </select>
        <select name="sort" defaultValue={searchParams.sort ?? "pts"} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {["pts", "ts_pct", "efg_pct", "three_pct", "usage_rate", "stocks"].map((metric) => <option key={metric} value={metric}>{metric}</option>)}
        </select>
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Apply</button>
      </form>
      <StatTable
        columns={[
          { key: "player", label: "Player", hrefKey: "href" },
          { key: "team", label: "Team" },
          { key: "pos", label: "Pos" },
          { key: "role", label: "Role" },
          { key: "games", label: "G", align: "right" },
          { key: "min", label: "MIN", align: "right" },
          { key: "pts", label: "PTS", align: "right" },
          { key: "ts", label: "TS%", align: "right" },
          { key: "usg", label: "USG%", align: "right" },
          { key: "ast", label: "AST", align: "right" },
          { key: "stocks", label: "STOCKS", align: "right" }
        ]}
        rows={rows}
      />
    </div>
  );
}
