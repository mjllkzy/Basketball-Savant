export function FilterPanel({ children }: { children: React.ReactNode }) {
  return <aside className="rounded border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-32">{children}</aside>;
}
