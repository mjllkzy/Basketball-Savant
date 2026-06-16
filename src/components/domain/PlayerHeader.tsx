import type { Player, Team } from "@/lib/types";

export function PlayerHeader({ player, team }: { player: Player; team: Team }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded text-2xl font-black text-white" style={{ background: team.primaryColor }}>
            {player.name.split(" ").map((part) => part[0]).join("")}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{team.city} {team.name}</div>
            <h1 className="text-3xl font-black tracking-tight text-ink">{player.name}</h1>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              #{player.jerseyNumber} · {player.position} · {player.height} · {player.weight} lb · {player.role}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <span className="rounded bg-slate-100 px-3 py-2 font-bold">Age {player.age}</span>
          <span className="rounded bg-slate-100 px-3 py-2 font-bold">Draft {player.draftYear}</span>
          <span className="rounded bg-slate-100 px-3 py-2 font-bold">Pick {player.draftPick}</span>
          <span className="rounded bg-slate-100 px-3 py-2 font-bold">{player.handedness}</span>
        </div>
      </div>
    </div>
  );
}
