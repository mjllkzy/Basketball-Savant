import { StatTable } from "@/components/ui/StatTable";
import type { Possession } from "@/lib/types";

export function PossessionTable({
  possessions,
  playerNames = {},
  teamNames = {},
}: {
  possessions: Possession[];
  playerNames?: Record<string, string>;
  teamNames?: Record<string, string>;
}) {
  const rows = possessions.slice(0, 80).map((possession) => ({
    quarter: `Q${possession.quarter}`,
    clock: possession.clock,
    offense: teamNames[possession.offenseTeamId] ?? possession.offenseTeamId,
    defense: teamNames[possession.defenseTeamId] ?? possession.defenseTeamId,
    player: playerNames[possession.primaryPlayerId] ?? possession.primaryPlayerId,
    playType: possession.playType,
    result: possession.resultType,
    points: possession.points,
    xpts: possession.expectedPoints.toFixed(2),
    ame: possession.actualMinusExpected.toFixed(2)
  }));
  return (
    <StatTable
      dense
      columns={[
        { key: "quarter", label: "Q" },
        { key: "clock", label: "Clock" },
        { key: "offense", label: "Offense" },
        { key: "defense", label: "Defense" },
        { key: "player", label: "Primary" },
        { key: "playType", label: "Play Type" },
        { key: "result", label: "Result" },
        { key: "points", label: "PTS", align: "right" },
        { key: "xpts", label: "xPTS", align: "right" },
        { key: "ame", label: "A-xE", align: "right" }
      ]}
      rows={rows}
    />
  );
}
