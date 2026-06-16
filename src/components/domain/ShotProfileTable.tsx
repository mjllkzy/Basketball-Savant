import { StatTable } from "@/components/ui/StatTable";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import type { PlayerSeasonAggregate } from "@/lib/types";

export function ShotProfileTable({ aggregate }: { aggregate: PlayerSeasonAggregate }) {
  const keys = ["rim_frequency", "short_midrange_frequency", "long_midrange_frequency", "corner_three_frequency", "above_break_three_frequency", "pull_up_frequency", "catch_and_shoot_frequency"];
  const rows = keys.map((key) => ({
    metric: getMetric(key).label,
    value: formatMetric(key, calculatePlayerMetric(key, aggregate)),
    formula: getMetric(key).formula
  }));
  return <StatTable dense columns={[{ key: "metric", label: "Shot Profile" }, { key: "value", label: "Value", align: "right" }, { key: "formula", label: "Formula" }]} rows={rows} />;
}
