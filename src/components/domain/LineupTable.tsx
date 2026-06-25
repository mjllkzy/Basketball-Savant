import { StatTable } from "@/components/ui/StatTable";
import type { Lineup } from "@/lib/types";

export function LineupTable({
  lineups,
  playerNames = {},
}: {
  lineups: Lineup[];
  playerNames?: Record<string, string>;
}) {
  const rows = lineups.slice(0, 20).map((lineup) => ({
    lineup: [lineup.player1Id, lineup.player2Id, lineup.player3Id, lineup.player4Id, lineup.player5Id]
      .map((playerId) => playerNames[playerId] ?? playerId)
      .map((name) => name.split(" ").slice(-1)[0])
      .join(" / "),
    poss: lineup.possessions,
    ortg: lineup.offensiveRating.toFixed(1),
    drtg: lineup.defensiveRating.toFixed(1),
    net: lineup.netRating.toFixed(1)
  }));
  return <StatTable dense columns={[{ key: "lineup", label: "Lineup" }, { key: "poss", label: "Poss", align: "right" }, { key: "ortg", label: "ORtg", align: "right" }, { key: "drtg", label: "DRtg", align: "right" }, { key: "net", label: "Net", align: "right" }]} rows={rows} />;
}
