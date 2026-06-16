import { MetricCard } from "@/components/ui/MetricCard";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import type { PlayerSeasonAggregate } from "@/lib/types";

export function PlayerSnapshot({ aggregate }: { aggregate: PlayerSeasonAggregate }) {
  const keys = ["pts", "reb", "ast", "ts_pct", "usage_rate", "stocks"];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {keys.map((key, index) => (
        <MetricCard key={key} label={key.replaceAll("_", " ").toUpperCase()} value={formatMetric(key, calculatePlayerMetric(key, aggregate))} accent={index % 2 ? "court" : "signal"} />
      ))}
    </div>
  );
}
