import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, GitCompare, Minus, Radar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PercentileBar } from "@/components/ui/PercentileBar";
import { comparisonRows, heightToInches, type ComparisonWinner } from "@/lib/comparison";
import {
  listComparisonPlayerOptions,
  loadComparisonPlayers,
  type ComparisonPlayer,
  type PlayerOption,
} from "@/lib/db/playerAnalytics.server";
import { formatMetric } from "@/lib/metrics/format";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";
import { nbaTeamLogoUrl, teamAccentColor, teamTintStyle } from "@/lib/teamBranding";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RouteSearchParams> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const isResult = singleParam(resolvedSearchParams, "mode") === "compare";
  return {
    title: "NBA Player Comparison",
    description: "Compare two NBA players across scoring, efficiency, playmaking, defense, role, and advanced metrics.",
    alternates: { canonical: "/compare" },
    robots: isResult ? { index: false, follow: true } : undefined,
  };
}

function PlayerSelect({ name, label, value, options }: { name: string; label: string; value: string; options: PlayerOption[] }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value} className="rounded border border-slate-300 px-3 py-2 text-sm">
        {options.map((player) => (
          <option key={player.slug} value={player.slug}>
            {player.name} · {player.teamAbbreviation} · {player.position}
          </option>
        ))}
      </select>
    </label>
  );
}

function WinnerIcon({ winner }: { winner: ComparisonWinner }) {
  if (winner === "left") {
    return <span aria-label="Left player wins" className="inline-flex h-9 w-12 items-center justify-center rounded bg-emerald-50 text-emerald-700"><ArrowLeft className="h-6 w-6" /></span>;
  }
  if (winner === "right") {
    return <span aria-label="Right player wins" className="inline-flex h-9 w-12 items-center justify-center rounded bg-red-50 text-red-700"><ArrowRight className="h-6 w-6" /></span>;
  }
  return <span aria-label="Tie" className="inline-flex h-9 w-12 items-center justify-center rounded bg-slate-100 text-slate-500"><Minus className="h-6 w-6" /></span>;
}

function PlayerCard({ profile }: { profile: ComparisonPlayer }) {
  const heightInches = heightToInches(profile.player.height);
  const logoUrl = nbaTeamLogoUrl(profile.team.id);
  const accentColor = teamAccentColor(profile.team);
  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-sm" style={teamTintStyle(profile.team)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]" style={{ color: accentColor }}>
            <span className="inline-grid h-7 w-7 place-items-center rounded-full border border-white/70 bg-white/85 shadow-sm">
              <Image
                src={logoUrl}
                alt={`${profile.team.city} ${profile.team.name} logo`}
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                unoptimized
              />
            </span>
            <span>{profile.team.abbreviation} · {profile.player.position}</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-ink">{profile.player.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {profile.player.height} · {profile.player.weight || "N/A"} lb · Age {profile.player.age}
            {heightInches ? ` · ${heightInches} in` : ""}
          </p>
        </div>
        <Link href={`/players/${profile.player.slug}`} className="rounded border border-slate-200 px-3 py-2 text-xs font-black text-ink hover:bg-slate-50">Profile</Link>
      </div>
      <div className="mt-4 grid gap-2">
        <PercentileBar label="True Shooting" value={profile.percentiles.tsPct} />
        <PercentileBar label="Usage" value={profile.percentiles.usageRate} />
        <PercentileBar label="PIE" value={profile.percentiles.pie} />
      </div>
    </div>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const mode = singleParam(resolvedSearchParams, "mode");

  if (mode !== "compare") {
    return (
      <div className="grid min-h-[calc(100vh-220px)] gap-4">
        <Link
          href="/compare?mode=compare"
          className="group relative isolate flex min-h-[360px] overflow-hidden rounded border border-signal/30 bg-signal p-8 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_42%)]" />
          <div className="relative flex h-full w-full flex-col justify-between">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-white/15">
              <GitCompare className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Side-by-side</div>
              <h1 className="mt-2 text-5xl font-black tracking-normal">Compare</h1>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">Player vs player edges across scoring, efficiency, creation, defense, and role stats.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-white">
              Open comparison <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link
          href="/similarity"
          className="group relative isolate flex min-h-[360px] overflow-hidden rounded border border-ink/20 bg-ink p-8 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,162,97,0.32),transparent_44%)]" />
          <div className="relative flex h-full w-full flex-col justify-between">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-white/15">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Player matching</div>
              <h1 className="mt-2 text-5xl font-black tracking-normal">Similarity</h1>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">Find player comps using stats, physical profile, position, and role-based similarity scoring.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-white">
              Open similarity <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  const options = await listComparisonPlayerOptions();
  const fallbackLeft = options.find((player) => player.slug === "luka-doncic")?.slug ?? options[0]?.slug ?? "";
  const fallbackRight = options.find((player) => player.slug === "nikola-jokic")?.slug ?? options[1]?.slug ?? fallbackLeft;
  const leftSlug = singleParam(resolvedSearchParams, "left") ?? fallbackLeft;
  const rightSlug = singleParam(resolvedSearchParams, "right") ?? fallbackRight;
  let [leftProfile, rightProfile] = await loadComparisonPlayers([leftSlug, rightSlug]);

  if (!leftProfile || !rightProfile) {
    [leftProfile, rightProfile] = await loadComparisonPlayers([fallbackLeft, fallbackRight]);
  }

  if (!leftProfile || !rightProfile) {
    return (
      <div className="grid gap-4">
        <PageHeader eyebrow="Compare" title="Player Comparison" description="Side-by-side player edges from masterfile box, advanced, physical, and role data." />
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Player comparison data is temporarily unavailable. The last generated dataset remains available through the player directory.
        </div>
      </div>
    );
  }

  const rows = comparisonRows(leftProfile.aggregate, rightProfile.aggregate);

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Compare" title="Player Comparison" description="Side-by-side player edges from masterfile box, advanced, physical, and role data." />

      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-ink">Side-by-Side</h2>
        <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px]">
          <input type="hidden" name="mode" value="compare" />
          <PlayerSelect name="left" label="Left Player" value={leftProfile.player.slug} options={options} />
          <PlayerSelect name="right" label="Right Player" value={rightProfile.player.slug} options={options} />
          <button className="self-end rounded bg-ink px-3 py-2 text-sm font-black text-white">Compare</button>
        </form>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PlayerCard profile={leftProfile} />
          <PlayerCard profile={rightProfile} />
        </div>
        <div className="table-scroll mt-4 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full table-fixed border-collapse bg-white text-sm">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Metric</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-black">{leftProfile.player.name}</th>
                <th className="border-b border-slate-200 px-3 py-3 text-center font-black">Edge</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left font-black">{rightProfile.player.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-semibold text-ink">{row.metric.label}</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${row.winner === "left" ? "font-black text-emerald-700" : ""}`}>{formatMetric(row.key, row.leftValue)}</td>
                  <td className="px-3 py-3 text-center"><WinnerIcon winner={row.winner} /></td>
                  <td className={`px-3 py-3 text-left tabular-nums ${row.winner === "right" ? "font-black text-red-700" : ""}`}>{formatMetric(row.key, row.rightValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
