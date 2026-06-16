import Link from "next/link";
import { getSimilarPlayers, type SimilarityBasis } from "@/lib/data/queries";

export function SimilarPlayersTable({ playerId, basis = "Overall" }: { playerId: string; basis?: SimilarityBasis }) {
  const rows = getSimilarPlayers(playerId, basis);
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-3 text-sm font-black text-ink">Similar Players · {basis}</div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, index) => (
          <Link key={row.player.id} href={`/players/${row.player.slug}`} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 p-3 text-sm hover:bg-slate-50">
            <span className="font-black text-slate-400">{index + 1}</span>
            <span>
              <span className="block font-black text-ink">{row.player.name}</span>
              <span className="text-xs text-slate-500">{row.team.abbreviation} · traits: {row.matchingTraits.join(", ")}</span>
            </span>
            <span className="font-black text-signal">{Math.round(row.score * 100)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
