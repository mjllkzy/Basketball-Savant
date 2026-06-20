import { MetricCard } from "@/components/ui/MetricCard";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import type { PlayerSeasonAggregate } from "@/lib/types";

export function PlayerSnapshot({ aggregate }: { aggregate: PlayerSeasonAggregate }) {
  const keys = ["pts", "reb", "ast", "stl", "blk", "ts_pct", "usage_rate"];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {keys.map((key, index) => (
        <MetricCard key={key} label={key.replaceAll("_", " ").toUpperCase()} value={formatMetric(key, calculatePlayerMetric(key, aggregate))} accent={index % 2 ? "court" : "signal"} />
      ))}
    </div>
  );
}
