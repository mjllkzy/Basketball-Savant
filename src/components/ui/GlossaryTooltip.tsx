import { getMetric } from "@/lib/metrics/registry";

export function GlossaryTooltip({ metricKey }: { metricKey: string }) {
  const metric = getMetric(metricKey);
  return (
    <span className="group relative inline-flex cursor-help items-center border-b border-dotted border-slate-400">
      {metric.shortLabel}
      <span className="pointer-events-none invisible absolute left-0 top-6 z-30 w-72 rounded border border-slate-200 bg-white p-3 text-left text-xs font-normal leading-5 text-slate-600 opacity-0 shadow-card group-hover:visible group-hover:opacity-100">
        <strong className="block text-ink">{metric.label}</strong>
        {metric.description}
        <span className="mt-2 block text-slate-500">Formula: {metric.formula}</span>
      </span>
    </span>
  );
}
