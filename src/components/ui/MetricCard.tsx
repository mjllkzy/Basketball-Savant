import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({
  label,
  value,
  sublabel,
  trend,
  accent = "signal"
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: number;
  accent?: "signal" | "court" | "ink";
}) {
  const accentClass = accent === "court" ? "text-court" : accent === "ink" ? "text-ink" : "text-signal";
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${accentClass}`}>{value}</div>
      <div className="mt-1 flex min-h-5 items-center gap-1 text-xs text-slate-500">
        {trend !== undefined ? trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-make" /> : <ArrowDownRight className="h-3.5 w-3.5 text-miss" /> : null}
        {sublabel}
      </div>
    </div>
  );
}
