import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PercentileRadar } from "@/components/charts/PercentileRadar";
import { RollingLineChart } from "@/components/charts/RollingLineChart";
import { ShotChart, sampleShotsForChart } from "@/components/charts/ShotChart";
import { PlayerHeader } from "@/components/domain/PlayerHeader";
import { PlayerSnapshot } from "@/components/domain/PlayerSnapshot";
import { PlayTypeBreakdown } from "@/components/domain/PlayTypeBreakdown";
import { ShotProfileTable } from "@/components/domain/ShotProfileTable";
import { SimilarPlayersTable } from "@/components/domain/SimilarPlayersTable";
import { StatTable } from "@/components/ui/StatTable";
import { PercentileBar } from "@/components/ui/PercentileBar";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";
import { loadMasterPlayerProfileDbFirst, masterProfileCategorySummary, masterProfileKeyStats } from "@/lib/data/masterProfiles.server";
import { formatShortDate } from "@/lib/date";
import { trueShootingPercentage } from "@/lib/metrics/formulas";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";
import { formatMetric, toPercentagePoints } from "@/lib/metrics/format";

export async function generateMetadata({ params }: { params: Promise<{ playerId: string }> }): Promise<Metadata> {
  const { playerId } = await params;
  const profile = await loadPlayerProfileAnalytics(playerId);
  if (!profile) return { title: "Player Not Found", robots: { index: false, follow: false } };

  const canonicalSlug = profile.masterSlug ?? profile.player.slug;
  const title = `${profile.player.name} Stats`;
  const description = `${profile.player.name} 2025-26 NBA stats, advanced metrics, percentiles, game logs, and player similarity analysis.`;
  return {
    title,
    description,
    alternates: { canonical: `/players/${canonicalSlug}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/players/${canonicalSlug}`,
    },
  };
}

function FeedRequiredPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-black text-ink">{title}</h2>
      <p className="text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const profile = await loadPlayerProfileAnalytics(playerId);
  if (!profile) notFound();
  const radarKeys = ["pts", "reb", "ast", "stl", "blk", "ts_pct", "usage_rate", "three_pct"];
  const radarData = radarKeys.map((key) => ({
    metric: getMetric(key).shortLabel,
    percentile: profile.metricValues.find((value) => value.metricKey === key)?.percentile ?? 0
  }));
  const gameRows = profile.gameLog.map((line) => ({
    date: formatShortDate(line.game.date),
    game: `${line.opponent.abbreviation}`,
    pts: line.pts,
    reb: line.reb,
    ast: line.ast,
    stl: line.stl,
    blk: line.blk,
    tov: line.tov,
    ts: formatMetric("ts_pct", trueShootingPercentage(line.pts, line.fga, line.fta)),
    pm: line.plusMinus
  }));
  const hasShotEvents = profile.shots.length > 0;
  const shotChartSampleSize = 120;
  const shotChartShots = sampleShotsForChart(profile.shots, shotChartSampleSize);
  const masterProfile = await loadMasterPlayerProfileDbFirst({ slug: profile.masterSlug, playerName: profile.player.name });
  const keyStats = masterProfile ? masterProfileKeyStats(masterProfile) : [];
  const categoryRows = masterProfile ? masterProfileCategorySummary(masterProfile).slice(0, 8) : [];

  return (
    <div className="grid gap-4">
      <PlayerHeader player={profile.player} team={profile.team} />
      <PlayerSnapshot aggregate={profile.aggregate} />
      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">Master Data Profile</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {masterProfile
                ? `${masterProfile.player_name} · ${masterProfile.season} ${masterProfile.season_type} · ${masterProfile.teams.join(", ") || profile.team.abbreviation}`
                : "Full master profile JSON is unavailable for this player; summary data remains loaded."}
            </p>
          </div>
          {masterProfile ? (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <span className="rounded bg-slate-100 px-3 py-2 font-bold">{masterProfile.source_sheets.length} source sheets</span>
              <span className="rounded bg-slate-100 px-3 py-2 font-bold">{masterProfile.stat_rows.toLocaleString()} stat rows</span>
              <span className="rounded bg-slate-100 px-3 py-2 font-bold">Team {masterProfile.primary_team ?? profile.team.abbreviation}</span>
              <span className="rounded bg-slate-100 px-3 py-2 font-bold">Master profile loaded</span>
            </div>
          ) : null}
        </div>
        {masterProfile ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
            <StatTable
              dense
              columns={[
                { key: "label", label: "Key Stat" },
                { key: "value", label: "Value", align: "right" },
                { key: "source", label: "Source Sheet" }
              ]}
              rows={keyStats.map((stat) => ({ label: stat.label, value: stat.value, source: stat.sourceSheet }))}
            />
            <StatTable
              dense
              columns={[
                { key: "category", label: "Category" },
                { key: "statRows", label: "Rows", align: "right" },
                { key: "sheetCount", label: "Sheets", align: "right" }
              ]}
              rows={categoryRows.map((row) => ({ category: row.category, statRows: row.statRows, sheetCount: row.sheetCount }))}
            />
          </div>
        ) : null}
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PercentileRadar data={radarData} />
        <RollingLineChart data={profile.aggregate.recentGameScores.map((row) => ({ date: formatShortDate(row.date), pts: row.pts, ts: toPercentagePoints(row.ts) ?? 0, usage: toPercentagePoints(row.usage) ?? 0, net: row.net }))} lines={["pts", "net"]} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        {hasShotEvents ? (
          <ShotChart shots={shotChartShots} colorBy="xpts" maxShots={shotChartSampleSize} totalAttempts={profile.shots.length} />
        ) : (
          <FeedRequiredPanel title="Shot Chart Feed Required" detail="This player has official season and game-log stats loaded, but row-level shot events are not present in the current snapshot." />
        )}
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-ink">Role Profile</h2>
          <div className="grid gap-3">
            {radarKeys.map((key) => <PercentileBar key={key} label={getMetric(key).label} value={profile.metricValues.find((value) => value.metricKey === key)?.percentile ?? 0} />)}
          </div>
          <div className="mt-4 rounded bg-slate-100 p-3 text-sm leading-6 text-slate-600">
            {profile.player.name} is shown from the 2025-26 Excel masterfile with NBA Stats and Basketball Reference cross-checks. Tracking-only measures stay hidden until a row-level event or optical source is connected.
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {hasShotEvents ? (
          <ShotProfileTable aggregate={profile.aggregate} />
        ) : (
          <FeedRequiredPanel title="Shot Profile Feed Required" detail="Rim frequency, corner-three rate, pull-up rate, and catch-and-shoot rate need shot-zone and shot-type event rows." />
        )}
        {hasShotEvents ? (
          <PlayTypeBreakdown aggregate={profile.aggregate} />
        ) : (
          <FeedRequiredPanel title="Play Type Feed Required" detail="Transition, pick-and-roll, isolation, post-up, cut, and spot-up PPP need tagged possession rows." />
        )}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <StatTable dense columns={[{ key: "date", label: "Date" }, { key: "game", label: "Opp" }, { key: "pts", label: "PTS", align: "right" }, { key: "reb", label: "REB", align: "right" }, { key: "ast", label: "AST", align: "right" }, { key: "stl", label: "STL", align: "right" }, { key: "blk", label: "BLK", align: "right" }, { key: "tov", label: "TOV", align: "right" }, { key: "ts", label: "TS", align: "right" }, { key: "pm", label: "+/-", align: "right" }]} rows={gameRows} />
        <SimilarPlayersTable rows={profile.similar} />
      </section>
      <FeedRequiredPanel title="Lineup Network Feed Required" detail="Five-player lineup ratings need lineup stint rows with possessions, offensive rating, defensive rating, and net rating." />
    </div>
  );
}
