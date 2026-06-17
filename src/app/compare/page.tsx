import Link from "next/link";
import { ArrowLeft, ArrowRight, GitCompare, Minus, Radar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PercentileBar } from "@/components/ui/PercentileBar";
import { getPlayerProfile, playerSeasonAggregates, players, teams } from "@/lib/data/queries";
import { comparisonRows, heightToInches, similarPlayers, type ComparisonWinner } from "@/lib/comparison";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

function selectedSlug(searchParams: RouteSearchParams, key: string, fallback: string) {
  return singleParam(searchParams, key) ?? fallback;
}

function defaultSlugById(playerId: string, fallbackIndex: number) {
  return players.find((player) => player.id === playerId)?.slug ?? players[fallbackIndex]?.slug ?? players[0].slug;
}

function PlayerSelect({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value} className="rounded border border-slate-300 px-3 py-2 text-sm">
        {players.map((player) => {
          const team = teams.find((item) => item.id === player.teamId);
          return (
            <option key={player.id} value={player.slug}>
              {player.name} · {team?.abbreviation ?? "NBA"} · {player.position}
            </option>
          );
        })}
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

function PlayerCard({ profile }: { profile: NonNullable<ReturnType<typeof getPlayerProfile>> }) {
  const heightInches = heightToInches(profile.player.height);
  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{profile.team.abbreviation} · {profile.player.position}</div>
          <h2 className="mt-1 text-2xl font-black text-ink">{profile.player.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {profile.player.height} · {profile.player.weight || "N/A"} lb · Age {profile.player.age}
            {heightInches ? ` · ${heightInches} in` : ""}
          </p>
        </div>
        <Link href={`/players/${profile.player.slug}`} className="rounded border border-slate-200 px-3 py-2 text-xs font-black text-ink hover:bg-slate-50">Profile</Link>
      </div>
      <div className="mt-4 grid gap-2">
        <PercentileBar label="True Shooting" value={profile.metricValues.find((value) => value.metricKey === "ts_pct")?.percentile ?? 0} />
        <PercentileBar label="Usage" value={profile.metricValues.find((value) => value.metricKey === "usage_rate")?.percentile ?? 0} />
        <PercentileBar label="PIE" value={profile.metricValues.find((value) => value.metricKey === "pie")?.percentile ?? 0} />
      </div>
    </div>
  );
}

export default function ComparePage({ searchParams }: { searchParams: RouteSearchParams }) {
  const mode = singleParam(searchParams, "mode");
  const defaultLeftSlug = defaultSlugById("1629029", 0);
  const defaultRightSlug = defaultSlugById("203999", 1);
  const leftSlug = selectedSlug(searchParams, "left", defaultLeftSlug);
  const rightSlug = selectedSlug(searchParams, "right", defaultRightSlug);
  const similaritySlug = selectedSlug(searchParams, "similarity", leftSlug);
  const leftProfile = getPlayerProfile(leftSlug) ?? getPlayerProfile(players[0].slug)!;
  const rightProfile = getPlayerProfile(rightSlug) ?? getPlayerProfile(players[1]?.slug ?? players[0].slug)!;
  const similarityProfile = getPlayerProfile(similaritySlug) ?? leftProfile;
  const rows = comparisonRows(leftProfile.aggregate, rightProfile.aggregate);
  const matches = similarPlayers(similarityProfile.aggregate, playerSeasonAggregates, 8);

  if (mode !== "compare") {
    return (
      <div className="grid min-h-[calc(100vh-220px)] gap-4 lg:grid-cols-2">
        <Link
          href={`/compare?mode=compare&left=${leftProfile.player.slug}&right=${rightProfile.player.slug}&similarity=${similarityProfile.player.slug}`}
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
          href={`/similarity?player=${similarityProfile.player.slug}`}
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

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Compare" title="Player Comparison" description="Side-by-side player edges and similarity scoring from official box, advanced, physical, and role data." />

      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-ink">Side-by-Side</h2>
        <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px]">
          <input type="hidden" name="mode" value="compare" />
          <PlayerSelect name="left" label="Left Player" value={leftProfile.player.slug} />
          <PlayerSelect name="right" label="Right Player" value={rightProfile.player.slug} />
          <input type="hidden" name="similarity" value={similarityProfile.player.slug} />
          <button className="self-end rounded bg-ink px-3 py-2 text-sm font-black text-white">Compare</button>
        </form>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PlayerCard profile={leftProfile} />
          <PlayerCard profile={rightProfile} />
        </div>
        <div className="table-scroll mt-4 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full border-collapse bg-white text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-left font-black">Metric</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-black">{leftProfile.player.name}</th>
                <th className="border-b border-slate-200 px-3 py-3 text-center font-black">Edge</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-black">{rightProfile.player.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-semibold text-ink">{row.metric.label}</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${row.winner === "left" ? "font-black text-emerald-700" : ""}`}>{formatMetric(row.key, row.leftValue)}</td>
                  <td className="px-3 py-3 text-center"><WinnerIcon winner={row.winner} /></td>
                  <td className={`px-3 py-3 text-right tabular-nums ${row.winner === "right" ? "font-black text-red-700" : ""}`}>{formatMetric(row.key, row.rightValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">Player Similarity</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Scores combine 55% statistical profile, 25% physical profile, and 20% position/role similarity from loaded official fields.
            </p>
          </div>
          <form className="grid min-w-0 gap-3 lg:grid-cols-[320px_110px]">
            <input type="hidden" name="mode" value="compare" />
            <input type="hidden" name="left" value={leftProfile.player.slug} />
            <input type="hidden" name="right" value={rightProfile.player.slug} />
            <PlayerSelect name="similarity" label="Find Similar To" value={similarityProfile.player.slug} />
            <button className="self-end rounded bg-ink px-3 py-2 text-sm font-black text-white">Find</button>
          </form>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {matches.map((match) => (
            <Link key={match.aggregate.player.id} href={`/players/${match.aggregate.player.slug}`} className="rounded border border-slate-200 p-4 hover:border-signal hover:bg-slate-50">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{match.aggregate.team.abbreviation} · {match.aggregate.player.position}</div>
              <h3 className="mt-1 text-lg font-black text-ink">{match.aggregate.player.name}</h3>
              <div className="mt-3 text-3xl font-black text-ink">{match.score}</div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Similarity Score</div>
              <div className="mt-3 grid gap-1 text-xs text-slate-600">
                <div>Stats {match.statScore} · Physical {match.physicalScore} · Role {match.roleScore}</div>
                <div className="font-semibold text-slate-700">Traits: {match.traits.join(", ")}</div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {formatMetric("pts", calculatePlayerMetric("pts", match.aggregate))} PTS · {formatMetric("ts_pct", calculatePlayerMetric("ts_pct", match.aggregate))} TS · {match.aggregate.player.height}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
