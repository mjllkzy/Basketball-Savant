import type { Game, Team } from "@/lib/types";

export function GameHeader({ game, homeTeam, awayTeam }: { game: Game; homeTeam: Team; awayTeam: Team }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{game.date} · {game.status} · {game.arena}</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">{awayTeam.city} {awayTeam.name} at {homeTeam.city} {homeTeam.name}</h1>
        </div>
        <div className="grid min-w-72 grid-cols-3 items-center gap-3 rounded bg-slate-100 p-3 text-center">
          <div>
            <div className="text-xs font-black text-slate-500">{awayTeam.abbreviation}</div>
            <div className="text-3xl font-black">{game.awayScore}</div>
          </div>
          <div className="text-xs font-black uppercase text-slate-500">Final</div>
          <div>
            <div className="text-xs font-black text-slate-500">{homeTeam.abbreviation}</div>
            <div className="text-3xl font-black">{game.homeScore}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
