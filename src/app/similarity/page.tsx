import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { SimilarPlayersTable } from "@/components/domain/SimilarPlayersTable";
import { listComparisonPlayerOptions, loadPlayerSimilarity } from "@/lib/db/playerAnalytics.server";
import { baseSeasonOptions, parseSeason } from "@/lib/seasons";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";
import { playerSimilaritySummary } from "@/lib/comparison";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RouteSearchParams> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const hasSelection = Boolean(singleParam(resolvedSearchParams, "player"));
  return {
    title: "NBA Player Similarity Finder",
    description: "Find statistically and physically similar NBA players using 2025-26 production, role, and profile data.",
    alternates: { canonical: "/similarity" },
    robots: hasSelection ? { index: false, follow: true } : undefined,
  };
}

function decimal(value: number) {
  return value.toFixed(1);
}

export default async function SimilarityPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const season = parseSeason(singleParam(resolvedSearchParams, "season"));
  const options = await listComparisonPlayerOptions(undefined, season);
  const selected = singleParam(resolvedSearchParams, "player") ?? options[0]?.slug ?? "";
  const result = await loadPlayerSimilarity(selected, undefined, season);
  const fallback = !result && options[0] ? await loadPlayerSimilarity(options[0].slug, undefined, season) : null;
  const similarity = result ?? fallback;

  if (!similarity) {
    return (
      <div className="grid gap-4">
        <PageHeader eyebrow="Similarity" title="Player Similarity Finder" description="Find the closest player profiles using masterfile production, scoring ratios, playmaking ratios, physical build, and position context." />
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Player similarity data is temporarily unavailable.
        </div>
      </div>
    );
  }

  const profile = similarity.target;
  const summary = playerSimilaritySummary(profile.aggregate);
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Similarity" title="Player Similarity Finder" description="Find the closest player profiles using masterfile production, scoring ratios, playmaking ratios, physical build, and position context." />
      <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[160px_1fr_120px]">
        <select name="season" defaultValue={season} aria-label="Season" className="rounded border border-slate-300 px-3 py-2 text-sm">
          {baseSeasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="player" defaultValue={profile.player.slug} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {options.map((option) => <option key={option.slug} value={option.slug}>{option.name} · {option.teamAbbreviation} · {option.position}</option>)}
        </select>
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Find</button>
      </form>
      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">Selected Player</div>
            <h2 className="mt-1 text-3xl font-black text-ink">{profile.player.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{profile.team.city} {profile.team.name} · {summary.position}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-4 lg:min-w-[560px]">
            <div className="rounded border border-slate-200 p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Build</div>
              <div className="mt-1 font-black text-ink">{summary.height} · {summary.weight}</div>
              <div className="mt-1 text-xs text-slate-500">Wingspan: {summary.wingspan}</div>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Box</div>
              <div className="mt-1 font-black text-ink">{decimal(summary.ppg)} PPG</div>
              <div className="mt-1 text-xs text-slate-500">{decimal(summary.rpg)} RPG · {decimal(summary.apg)} APG</div>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Per 36</div>
              <div className="mt-1 font-black text-ink">{decimal(summary.ptsPer36)} PTS</div>
              <div className="mt-1 text-xs text-slate-500">{decimal(summary.rebPer36)} REB · {decimal(summary.astPer36)} AST</div>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Sample</div>
              <div className="mt-1 font-black text-ink">{summary.games} G</div>
              <div className="mt-1 text-xs text-slate-500">{decimal(summary.minutesPerGame)} MPG</div>
            </div>
          </div>
        </div>
      </section>
      <div data-data-source={similarity.source}>
        <SimilarPlayersTable rows={similarity.matches} season={season} />
      </div>
    </div>
  );
}
