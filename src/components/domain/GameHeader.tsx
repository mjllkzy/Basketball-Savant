import type { Game, Team } from "@/lib/types";
import { formatShortDate } from "@/lib/date";

export function GameHeader({ game, homeTeam, awayTeam }: { game: Game; homeTeam: Team; awayTeam: Team }) {
  const detail = [formatShortDate(game.date), game.status, game.neutralSite ? "Neutral site" : game.arena].filter(Boolean).join(" · ");
  const separator = game.neutralSite ? "vs." : "at";
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{detail}</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">{awayTeam.city} {awayTeam.name} {separator} {homeTeam.city} {homeTeam.name}</h1>
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
