import { StatTable } from "@/components/ui/StatTable";
import type { Possession } from "@/lib/types";
import { playerName, teamName } from "@/lib/data/queries";

export function PossessionTable({ possessions }: { possessions: Possession[] }) {
  const rows = possessions.slice(0, 80).map((possession) => ({
    quarter: `Q${possession.quarter}`,
    clock: possession.clock,
    offense: teamName(possession.offenseTeamId),
    defense: teamName(possession.defenseTeamId),
    player: playerName(possession.primaryPlayerId),
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
