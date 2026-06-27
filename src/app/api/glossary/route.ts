import { STATIC_DATA_CACHE_CONTROL, cachedOk } from "@/lib/api/response";
import { metricRegistry } from "@/lib/metrics/registry";

export function GET() {
  return cachedOk(metricRegistry.filter((metric) => metric.key !== "stocks").map((metric) => ({ key: metric.key, label: metric.label, category: metric.category, definition: metric.description, formula: metric.formula, unit: metric.unit, higherIsBetter: metric.higherIsBetter, requiredData: metric.sourceType, sampleNotes: metric.sampleQualifier })), undefined, STATIC_DATA_CACHE_CONTROL);
}
