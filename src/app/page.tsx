import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, GitCompare, ShieldCheck, Users } from "lucide-react";
import { dataSourceMetadata, players, teams } from "@/lib/data/queries";

const tools = [
  { href: "/players", label: "Player Intelligence", icon: Users, body: "Search every loaded player by role, team, volume, efficiency, creation, and impact." },
  { href: "/teams", label: "Team Index", icon: BarChart3, body: "Compare team records, ratings, pace, shooting profile, and possession context." },
  { href: "/compare", label: "Compare + Similarity", icon: GitCompare, body: "Put two players side by side, then find statistically and physically similar players." }
];

export default function HomePage() {
  return (
    <div className="grid gap-6">
      <section className="relative min-h-[520px] overflow-hidden rounded border border-slate-200 bg-ink text-white shadow-card">
        <Image src="/brand/basketball-savant-hero.png" alt="" fill priority className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,24,32,0.18),rgba(16,24,32,0.9))]" />
        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded border border-white/20 bg-white/12 text-2xl font-black tracking-[0.12em] shadow-card backdrop-blur">BS</div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-teal-200">Official Basketball Intelligence</p>
          <h1 className="max-w-4xl text-5xl font-black tracking-normal sm:text-7xl">Basketball Savant</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-100 sm:text-lg">
            A focused basketball analytics workspace for comparing players, understanding teams, and finding similar profiles using official NBA Stats snapshots with Basketball Reference cross-checks.
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

      <section className="grid gap-4 rounded border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Players Loaded</div>
          <div className="mt-1 text-3xl font-black text-signal">{players.length}</div>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Teams Loaded</div>
          <div className="mt-1 text-3xl font-black text-signal">{teams.length}</div>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Source Status</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded bg-teal-50 px-3 py-2 text-sm font-black text-signal">
            <ShieldCheck className="h-4 w-4" />
            NBA Stats + Basketball Reference
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600 md:col-span-3">
          Current snapshot generated {new Date(dataSourceMetadata.generatedAt).toLocaleDateString("en-US")}. Tracking-only metrics stay hidden until a real event or optical data source is connected.
        </p>
      </section>
    </div>
  );
}
