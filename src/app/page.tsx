import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ExternalLink, GitCompare, Newspaper, Users } from "lucide-react";
import { ShotClockMark } from "@/components/brand/ShotClockMark";
import { categoryTone, formatNewsDate, getRecentNews, reportingStatusTone } from "@/lib/news";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const tools = [
  { href: "/players", label: "Player Intelligence", icon: Users, body: "Search every loaded player by role, team, volume, efficiency, creation, and impact." },
  { href: "/teams", label: "Team Index", icon: BarChart3, body: "Compare team records, ratings, pace, shooting profile, and possession context." },
  { href: "/compare", label: "Compare + Similarity", icon: GitCompare, body: "Put two players side by side, then find statistically and physically similar players." }
];

export default function HomePage() {
  const latestNews = getRecentNews(3);

  return (
    <div className="grid gap-6">
      <section className="relative min-h-[520px] overflow-hidden rounded border border-slate-200 bg-ink text-white shadow-card">
        <Image src="/brand/shotclock-hero.png" alt="" fill priority className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,24,32,0.18),rgba(16,24,32,0.9))]" />
        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
          <ShotClockMark className="mb-5 h-20 w-20 shadow-card" idPrefix="shotclock-hero-mark" />
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-teal-200">Advanced Basketball Analytics</p>
          <h1 className="max-w-4xl text-5xl font-black tracking-normal sm:text-7xl">ShotClock</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-100 sm:text-lg">
            A focused basketball analytics workspace for comparing players, understanding teams, and finding similar profiles from the 2025-26 Excel masterfile, official NBA Stats snapshots, and Basketball Reference cross-checks.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/players" className="inline-flex min-h-11 items-center gap-2 rounded bg-white px-5 text-sm font-black text-ink hover:bg-slate-100">
              Explore Players <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/compare" className="inline-flex min-h-11 items-center gap-2 rounded border border-white/25 bg-white/10 px-5 text-sm font-black text-white backdrop-blur hover:bg-white/15">
              Compare Players
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="rounded border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
              <Icon className="h-6 w-6 text-signal" />
              <h2 className="mt-4 text-xl font-black text-ink">{tool.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{tool.body}</p>
            </Link>
          );
        })}
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-signal">
              <Newspaper className="h-4 w-4" />
              Latest News
            </div>
            <h2 className="mt-1 text-2xl font-black text-ink">League Pulse</h2>
          </div>
          <Link href="/news" className="inline-flex min-h-10 items-center gap-2 rounded border border-slate-200 px-4 text-sm font-black text-ink hover:bg-slate-50">
            View News
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {latestNews.map((item) => (
            <article key={item.id} className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${categoryTone(item.category)}`}>{item.category}</span>
                <span className={`rounded border px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${reportingStatusTone(item.reportingStatus)}`}>{item.reportingStatus}</span>
                <span className="text-xs font-bold text-slate-500">{formatNewsDate(item.publishedAt)}</span>
              </div>
              <h3 className="text-base font-black leading-tight text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
              <Link href={item.sourceUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-signal hover:text-ink">
                {item.sourceName}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
