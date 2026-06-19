import type { Player, Team } from "@/lib/types";
import { PlayerHeadshot } from "@/components/domain/PlayerHeadshot";

type PlayerFactSource = Pick<Player, "age" | "college" | "country" | "draftYear" | "draftPick" | "handedness">;

function cleanBioValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "N/A" ? trimmed : undefined;
}

export function playerHeaderFacts(player: PlayerFactSource) {
  const college = cleanBioValue(player.college);
  const country = cleanBioValue(player.country);
  const draftFact = player.draftYear
    ? `Draft: ${player.draftYear}${player.draftPick ? ` · Pick ${player.draftPick}` : ""}`
    : "Undrafted";

  return [
    Number.isFinite(player.age) && player.age > 0 ? `Age ${player.age}` : undefined,
    college ? `College: ${college}` : country ? `Country: ${country}` : "Bio background pending",
    draftFact,
    college && country ? `Country: ${country}` : undefined,
    player.handedness ? `${player.handedness}-handed` : undefined
  ].filter(Boolean);
}

export function PlayerHeader({ player, team }: { player: Player; team: Team }) {
  const bioLine = [
    player.jerseyNumber ? `#${player.jerseyNumber}` : undefined,
    player.position !== "N/A" ? player.position : undefined,
    player.height !== "N/A" ? player.height : undefined,
    player.weight ? `${player.weight} lb` : undefined
  ].filter(Boolean);
  const facts = playerHeaderFacts(player);

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PlayerHeadshot src={player.headshotUrl} alt={`${player.name} official NBA headshot`} priority />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{team.city} {team.name}</div>
            <h1 className="text-3xl font-black tracking-tight text-ink">{player.name}</h1>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              {bioLine.length ? bioLine.join(" · ") : "Bio fields unavailable in current NBA Stats snapshot"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {facts.map((fact) => (
            <span key={fact} className="flex min-h-12 items-center rounded bg-slate-100 px-3 py-2 font-bold leading-snug">{fact}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
