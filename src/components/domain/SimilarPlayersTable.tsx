import Link from "next/link";
import { getSimilarPlayers } from "@/lib/data/queries";

function decimal(value: number) {
  return value.toFixed(1);
}

export function SimilarPlayersTable({ playerId }: { playerId: string }) {
  const rows = getSimilarPlayers(playerId);
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-3 text-sm font-black text-ink">Most Similar Players</div>
      <div className="table-scroll overflow-x-auto">
        <table className="min-w-[980px] border-collapse text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Rk</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Player</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Physical</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Box</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Per 36</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Score</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Components</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Closest Traits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.player.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                <td className="px-3 py-3 font-black text-slate-400">{index + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/players/${row.player.slug}`} className="font-black text-signal hover:underline">{row.player.name}</Link>
                  <div className="mt-1 text-xs text-slate-500">{row.team.abbreviation} · {row.summary.games} G · {decimal(row.summary.minutesPerGame)} MPG</div>
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-slate-600">
                  <div>{row.summary.position} · {row.summary.height} · {row.summary.weight}</div>
                  <div>Wingspan: {row.summary.wingspan}</div>
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-slate-700">
                  <div>{decimal(row.summary.ppg)} PPG</div>
                  <div>{decimal(row.summary.rpg)} RPG · {decimal(row.summary.apg)} APG</div>
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-slate-700">
                  <div>{decimal(row.summary.ptsPer36)} PTS</div>
                  <div>{decimal(row.summary.rebPer36)} REB · {decimal(row.summary.astPer36)} AST</div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-2xl font-black text-ink">{row.score}</span>
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-slate-600">
                  <div>Stats {row.ratioScore} · Rates {row.perMinuteScore}</div>
                  <div>Physical {row.physicalScore} · Role {row.roleScore}</div>
                </td>
                <td className="px-3 py-3 text-xs font-semibold text-slate-600">{row.matchingTraits.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
