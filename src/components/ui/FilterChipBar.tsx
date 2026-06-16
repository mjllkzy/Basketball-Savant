export function FilterChipBar({ chips }: { chips: string[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
          {chip}
        </span>
      ))}
    </div>
  );
}
