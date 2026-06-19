import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { categoryTone, formatNewsDate, newsFeed } from "@/lib/news";

export default function NewsPage() {
  const featured = newsFeed[0];
  const remaining = newsFeed.slice(1);

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="News Desk"
        title="NBA News"
        description="Recent NBA headlines, roster movement, injury notes, draft reports, and league context pulled from credible basketball sources."
      />

      <section className="rounded border border-slate-200 bg-ink p-5 text-white shadow-card">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-teal-100">
              <Newspaper className="h-4 w-4" />
              Latest Lead
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{featured.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{featured.summary}</p>
          </div>
          <div className="rounded border border-white/15 bg-white/10 p-4">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-teal-100">{featured.category}</div>
            <div className="mt-2 text-2xl font-black">{formatNewsDate(featured.publishedAt)}</div>
            <Link href={featured.sourceUrl} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-white hover:text-teal-100">
              {featured.sourceName}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {remaining.map((item) => (
          <article key={item.id} className="flex min-h-64 flex-col rounded border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] ${categoryTone(item.category)}`}>{item.category}</span>
              <span className="text-xs font-bold text-slate-500">{formatNewsDate(item.publishedAt)}</span>
            </div>
            <h2 className="mt-4 text-xl font-black leading-tight text-ink">{item.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.summary}</p>
            <Link href={item.sourceUrl} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-signal hover:text-ink">
              Source: {item.sourceName}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
