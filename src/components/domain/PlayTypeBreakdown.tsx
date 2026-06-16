import { StatTable } from "@/components/ui/StatTable";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import type { PlayerSeasonAggregate } from "@/lib/types";

export function PlayTypeBreakdown({ aggregate }: { aggregate: PlayerSeasonAggregate }) {
  const keys = ["transition_ppp", "halfcourt_ppp", "pnr_handler_ppp", "isolation_ppp", "spot_up_ppp", "cut_ppp", "post_up_ppp"];
  const rows = keys.map((key) => ({ playType: getMetric(key).label, ppp: formatMetric(key, calculatePlayerMetric(key, aggregate)), sample: Math.round(aggregate.fga / 4 + aggregate.player.skill * 8) }));
  return <StatTable dense columns={[{ key: "playType", label: "Play Type" }, { key: "ppp", label: "PPP", align: "right" }, { key: "sample", label: "Poss", align: "right" }]} rows={rows} />;
}
