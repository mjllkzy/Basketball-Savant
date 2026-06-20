import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { metricRegistry } from "@/lib/metrics/registry";

export default function GlossaryPage() {
  const rows = metricRegistry.filter((metric) => metric.key !== "stocks").map((metric) => ({
    name: metric.label,
    short: metric.shortLabel,
    category: metric.category,
    formula: metric.formula,
    unit: metric.unit,
    higher: metric.higherIsBetter ? "Yes" : "No",
    data: metric.requiresTracking ? `${metric.sourceType} feed required` : metric.sourceType,
    notes: metric.sampleQualifier
  }));
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Metric Registry" title="Glossary" description="Every displayed statistic is registered here with definition, formula, unit, data requirement, directionality, and sample-size notes." />
      <StatTable columns={[{ key: "name", label: "Name" }, { key: "short", label: "Short" }, { key: "category", label: "Category" }, { key: "formula", label: "Formula" }, { key: "unit", label: "Unit" }, { key: "higher", label: "Higher?" }, { key: "data", label: "Required Data" }, { key: "notes", label: "Sample Notes" }]} rows={rows} />
    </div>
  );
}
