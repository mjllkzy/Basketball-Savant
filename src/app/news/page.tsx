import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { NewsMetaBadges } from "@/components/domain/NewsMetaBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  NEWS_RETENTION_DAYS,
  filterNewsFeed,
  formatNewsDate,
  getBiggestNewsLead,
  newsFeedCount,
  newsFeedFilters,
  normalizeNewsFilter,
  type NewsItem,
} from "@/lib/news";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

function newsFilterHref(value: string) {
  return value === "all" ? "/news" : `/news?filter=${value}`;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="flex min-h-64 flex-col rounded border border-slate-200 bg-white p-5 shadow-sm">
      <NewsMetaBadges item={item} />
      <h2 className="mt-4 text-xl font-black leading-tight text-ink">{item.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.summary}</p>
      <Link href={item.sourceUrl} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-signal hover:text-ink">
        Source: {item.sourceName}
        <ExternalLink className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const activeFilter = normalizeNewsFilter(singleParam(resolvedSearchParams, "filter"));
  const newsWindow = { withinDays: NEWS_RETENTION_DAYS };
  const filteredNews = filterNewsFeed(activeFilter, newsWindow);
  const featured = getBiggestNewsLead(activeFilter, newsWindow);
  const remaining = filteredNews.filter((item) => item.id !== featured?.id);

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="News Desk"
        title="NBA News"
        description="Important NBA headlines, roster movement, injury notes, draft reports, and league context from the rolling 3-day news window."
        actions={
          <nav className="inline-flex rounded border border-slate-200 bg-white p-1 shadow-sm" aria-label="News feed filter">
            {newsFeedFilters.map((filter) => {
              const active = filter.value === activeFilter;
              return (
                <Link
                  key={filter.value}
                  href={newsFilterHref(filter.value)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center gap-2 rounded px-3 text-xs font-black uppercase tracking-[0.12em] ${active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}
                >
                  {filter.label}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{newsFeedCount(filter.value, newsWindow)}</span>
                </Link>
              );
            })}
          </nav>
        }
      />

      {featured ? (
        <>
          <section className="rounded border border-slate-200 bg-ink p-5 text-white shadow-card">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-teal-100">
                  <Newspaper className="h-4 w-4" />
                  Biggest Lead
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{featured.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{featured.summary}</p>
              </div>
              <div className="rounded border border-white/15 bg-white/10 p-4">
                <NewsMetaBadges item={featured} showDate={false} />
                <div className="mt-2 text-2xl font-black">{formatNewsDate(featured.publishedAt)}</div>
                <Link href={featured.sourceUrl} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-white hover:text-teal-100">
                  {featured.sourceName}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {remaining.length ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {remaining.map((item) => <NewsCard key={item.id} item={item} />)}
            </section>
          ) : null}
        </>
      ) : filteredNews.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredNews.map((item) => <NewsCard key={item.id} item={item} />)}
        </section>
      ) : (
        <section className="rounded border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          No news items match this filter.
        </section>
      )}
    </div>
  );
}
