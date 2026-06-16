import { StatTable } from "@/components/ui/StatTable";
import { lineupPlayers } from "@/lib/data/queries";
import type { Lineup } from "@/lib/types";

export function LineupTable({ lineups }: { lineups: Lineup[] }) {
  const rows = lineups.slice(0, 20).map((lineup) => ({
    lineup: lineupPlayers(lineup).map((player) => player.name.split(" ").slice(-1)[0]).join(" / "),
    poss: lineup.possessions,
    ortg: lineup.offensiveRating.toFixed(1),
    drtg: lineup.defensiveRating.toFixed(1),
    net: lineup.netRating.toFixed(1)
  }));
  return <StatTable dense columns={[{ key: "lineup", label: "Lineup" }, { key: "poss", label: "Poss", align: "right" }, { key: "ortg", label: "ORtg", align: "right" }, { key: "drtg", label: "DRtg", align: "right" }, { key: "net", label: "Net", align: "right" }]} rows={rows} />;
}
