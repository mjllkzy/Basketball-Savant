import { ok } from "@/lib/api/response";
import { metricRegistry } from "@/lib/metrics/registry";

export function GET() {
  return ok(metricRegistry.map((metric) => ({ key: metric.key, label: metric.label, category: metric.category, definition: metric.description, formula: metric.formula, unit: metric.unit, higherIsBetter: metric.higherIsBetter, requiredData: metric.sourceType, sampleNotes: metric.sampleQualifier })));
}
