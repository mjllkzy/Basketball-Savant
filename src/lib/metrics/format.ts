import { getMetric } from "@/lib/metrics/registry";
import { roundMetric } from "@/lib/metrics/formulas";

export function formatMetric(key: string, value: number | null | undefined): string {
  const metric = getMetric(key);
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  if (metric.unit === "percentage") {
    return `${(value * 100).toLocaleString(undefined, {
      minimumFractionDigits: metric.precision,
      maximumFractionDigits: metric.precision
    })}%`;
  }

  const rounded = roundMetric(value, metric.precision);
  if (rounded === null) return "N/A";
  if (metric.unit === "points") return rounded.toFixed(metric.precision);
  if (metric.unit === "rating") return rounded.toFixed(metric.precision);
  if (metric.unit === "per75") return rounded.toFixed(metric.precision);
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: metric.precision,
    maximumFractionDigits: metric.precision
  });
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value);
}
