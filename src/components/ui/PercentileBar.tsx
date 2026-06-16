export function PercentileBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-ink">{Math.round(clamped)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-200">
        <div className="h-full rounded bg-signal" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
