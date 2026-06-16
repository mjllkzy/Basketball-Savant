import Link from "next/link";
import { Activity, BarChart3, BookOpen, GitCompare, Home, Search, Shield, Users, Workflow } from "lucide-react";
import { CommandSearch } from "@/components/layout/CommandSearch";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/leaderboards", label: "Leaderboards", icon: BarChart3 },
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/games", label: "Games", icon: Activity },
  { href: "/visuals", label: "Visuals", icon: Workflow },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/glossary", label: "Glossary", icon: BookOpen }
];

const leaderboardItems = ["Scoring", "Shooting", "Shot Quality", "Playmaking", "Defense", "Rebounding", "Play Type", "Clutch", "Lineups", "Rolling Windows", "Percentiles", "Custom"];
const visualItems = ["Shot Chart", "Shot Heatmap", "Pass Map", "Touch Map", "Lineup Network", "Rolling Trends", "Player Radar", "Team Style Map"];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-3 py-3 sm:px-5 lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-ink text-sm font-black text-white">BS</div>
            <div>
              <div className="text-base font-black uppercase tracking-[0.18em] text-ink">Basketball Savant</div>
              <div className="text-xs font-medium text-slate-500">Advanced basketball intelligence</div>
            </div>
          </Link>
          <CommandSearch />
        </div>
        <nav className="table-scroll flex gap-1 overflow-x-auto pb-1 text-sm font-semibold text-slate-700">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded border border-transparent px-3 hover:border-slate-200 hover:bg-slate-50">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="group relative shrink-0">
            <Link href="/leaderboards/custom" className="inline-flex min-h-9 items-center gap-2 rounded border border-slate-200 px-3 hover:bg-slate-50">
              Custom
            </Link>
            <div className="invisible absolute left-0 top-10 z-50 grid w-56 gap-1 rounded border border-slate-200 bg-white p-2 opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100">
              {leaderboardItems.map((item) => (
                <Link key={item} href={item === "Custom" ? "/leaderboards/custom" : `/leaderboards?category=${encodeURIComponent(item)}`} className="rounded px-3 py-2 text-xs hover:bg-slate-50">
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div className="group relative shrink-0">
            <Link href="/visuals" className="inline-flex min-h-9 items-center gap-2 rounded border border-slate-200 px-3 hover:bg-slate-50">
              Visual Lab
            </Link>
            <div className="invisible absolute left-0 top-10 z-50 grid w-56 gap-1 rounded border border-slate-200 bg-white p-2 opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100">
              {visualItems.map((item) => (
                <Link key={item} href={`/visuals?tab=${encodeURIComponent(item)}`} className="rounded px-3 py-2 text-xs hover:bg-slate-50">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
