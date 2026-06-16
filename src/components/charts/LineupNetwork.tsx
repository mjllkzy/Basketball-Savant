import type { Lineup, Player } from "@/lib/types";

export function LineupNetwork({ lineups, players }: { lineups: Lineup[]; players: Player[] }) {
  const top = lineups.slice(0, 4);
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-black text-ink">Lineup Network</h3>
      <div className="grid gap-2">
        {top.map((lineup) => {
          const lineupPlayers = [lineup.player1Id, lineup.player2Id, lineup.player3Id, lineup.player4Id, lineup.player5Id].map((id) => players.find((player) => player.id === id)!);
          return (
            <div key={lineup.id} className="rounded border border-slate-200 p-2">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span>{lineup.possessions} poss</span>
                <span className={lineup.netRating >= 0 ? "text-make" : "text-miss"}>{lineup.netRating.toFixed(1)} net</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {lineupPlayers.map((player) => (
                  <span key={player.id} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">
                    {player.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
