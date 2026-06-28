import { PageHeader } from "@/components/ui/PageHeader";

export default function AboutPage() {
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="About" title="ShotClock" description="ShotClock Advanced Basketball Analytics is an official-data-first basketball analytics portal inspired by the depth of advanced sports tools." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-ink">Data Source Notes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            ShotClock loads official NBA Stats public snapshots for teams, players, rosters, and box-score totals. Game logs, shot events, possession feeds, and tracking-only details display only when those real feeds are present.
          </p>
        </section>
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-ink">Adapter Path</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The query layer is shaped like a production data adapter. It can be pointed at PostgreSQL, DuckDB, Parquet, official CSV exports, or licensed data feeds without rewriting page components.
          </p>
        </section>
      </div>
    </div>
  );
}
