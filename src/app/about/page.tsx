import { PageHeader } from "@/components/ui/PageHeader";

export default function AboutPage() {
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="About" title="Basketball Savant" description="A full-stack seed-data MVP for an original basketball analytics portal inspired by the depth of advanced sports tools." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-ink">Data Source Notes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This MVP uses fictional teams, players, games, possessions, shots, passes, rebounds, defensive events, and tracking-like features. No official logos, protected league assets, proprietary layouts, or scraped protected data are included.
          </p>
        </section>
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-ink">Adapter Path</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The seed query layer is intentionally shaped like a future database adapter. Replace it with PostgreSQL, DuckDB, Parquet, or licensed data feeds without rewriting page components.
          </p>
        </section>
      </div>
    </div>
  );
}
