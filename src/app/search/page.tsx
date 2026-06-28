import type { Metadata } from "next";
import { ShotChart } from "@/components/charts/ShotChart";
import { ShotHeatmap } from "@/components/charts/ShotHeatmap";
import { ShotSearchResults } from "@/components/domain/ShotSearchResults";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { FilterChipBar } from "@/components/ui/FilterChipBar";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShareUrlButton } from "@/components/ui/ShareUrlButton";
import { teamShotCacheAttempts } from "@/lib/data/teamShotCache";
import { formatShortDate } from "@/lib/date";
import { gameMatchupLabel } from "@/lib/db/gameAnalytics.server";
import { loadShotSearchOptions, searchShotAnalytics } from "@/lib/db/shotSearch.server";
import { formatMetric } from "@/lib/metrics/format";
import { booleanParam, numberParam, singleParam, type RouteSearchParams } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = {
    q: singleParam(resolvedSearchParams, "q"),
    playerId: singleParam(resolvedSearchParams, "playerId"),
    teamId: singleParam(resolvedSearchParams, "teamId"),
    quarter: numberParam(resolvedSearchParams, "quarter"),
    clutch: booleanParam(resolvedSearchParams, "clutch"),
    shotZone: singleParam(resolvedSearchParams, "shotZone"),
    playType: singleParam(resolvedSearchParams, "playType"),
    result: singleParam(resolvedSearchParams, "result") as "made" | "missed" | undefined,
    assisted: booleanParam(resolvedSearchParams, "assisted"),
    pullUp: booleanParam(resolvedSearchParams, "pullUp"),
    catchAndShoot: booleanParam(resolvedSearchParams, "catchAndShoot"),
    minExpectedPoints: numberParam(resolvedSearchParams, "minExpectedPoints"),
    minActualMinusExpected: numberParam(resolvedSearchParams, "minActualMinusExpected"),
    maxActualMinusExpected: numberParam(resolvedSearchParams, "maxActualMinusExpected"),
    pageSize: 60
  };
  const [result, options] = await Promise.all([
    searchShotAnalytics(filters),
    loadShotSearchOptions(),
  ]);
  const playersById = new Map(options.players.flatMap((player) => [
    [player.slug, player.name] as const,
    ...(player.id ? [[player.id, player.name] as const] : []),
  ]));
  const teamsById = new Map(options.teams.map((team) => [team.id, team] as const));
  const hasShotFeed = teamShotCacheAttempts > 0;
  const tableRows = result.rows.map((shot) => {
    const item = result.gameLookup.get(shot.gameId);
    const game = item?.game;
    const opponentId = game
      ? (game.homeTeamId === shot.teamId ? game.awayTeamId : game.homeTeamId)
      : "";
    const team = teamsById.get(shot.teamId);
    const opponent = teamsById.get(opponentId);
    return {
      id: shot.id,
      date: game ? formatShortDate(game.date) : "N/A",
      game: item ? gameMatchupLabel(item) : shot.gameId,
      quarter: `Q${shot.quarter}`,
      clock: shot.clock,
      player: playersById.get(shot.playerId) ?? shot.playerId,
      team: team ? `${team.city} ${team.name}` : shot.teamId,
      opponent: opponent ? `${opponent.city} ${opponent.name}` : opponentId || "N/A",
      playType: shot.playType,
      shotZone: shot.shotZone,
      shotType: shot.shotType,
      defender: shot.closestDefender,
      defenderDistance: `${shot.defenderDistance.toFixed(1)} ft`,
      dribbles: shot.dribblesBeforeShot,
      touchTime: `${shot.touchTime.toFixed(1)}s`,
      shotClock: shot.shotClock,
      xfg: formatMetric("expected_fg_pct", shot.expectedFgPct),
      xpts: shot.expectedPoints.toFixed(2),
      result: shot.made ? "Made" : "Miss",
      points: shot.made ? shot.pointsValue : 0,
      ame: shot.actualMinusExpected.toFixed(2),
      x: shot.x,
      y: shot.y,
      made: shot.made,
      possessionId: shot.possessionId
    };
  });
  const chips = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== "" && value !== 60)
    .map(([key, value]) => `${key}: ${value}`);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Advanced Search"
        title="Possession and Shot Search"
        description="Filter official shot and possession events when those feeds are loaded; unavailable event-only fields stay empty rather than generated."
        actions={<><ShareUrlButton /><ExportCsvButton rows={tableRows} filename="shotclock-shot-search.csv" /></>}
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <FilterPanel>
          <form className="grid gap-3 text-sm">
            <input name="q" defaultValue={filters.q} placeholder="Keyword" className="rounded border border-slate-300 px-3 py-2" />
            <select name="playerId" defaultValue={filters.playerId ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">All players</option>
              {options.players.map((player) => <option key={player.slug} value={player.slug}>{player.name} · {player.teamAbbreviation}</option>)}
            </select>
            <select name="teamId" defaultValue={filters.teamId ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">All teams</option>
              {options.teams.map((team) => <option key={team.id} value={team.id}>{team.abbreviation}</option>)}
            </select>
            <select name="quarter" defaultValue={filters.quarter ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">Any quarter</option>
              {[1, 2, 3, 4].map((quarter) => <option key={quarter}>{quarter}</option>)}
            </select>
            <select name="shotZone" defaultValue={filters.shotZone ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">All zones</option>
              {["Rim", "Short Midrange", "Long Midrange", "Corner Three", "Above Break Three"].map((zone) => <option key={zone}>{zone}</option>)}
            </select>
            <select name="playType" defaultValue={filters.playType ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">All play types</option>
              {["Transition", "P&R Handler", "P&R Roll Man", "Isolation", "Post-Up", "Handoff", "Cut", "Off-Screen", "Spot-Up", "Putback"].map((playType) => <option key={playType}>{playType}</option>)}
            </select>
            <select name="result" defaultValue={filters.result ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">Any result</option>
              <option value="made">Made</option>
              <option value="missed">Missed</option>
            </select>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="clutch" value="true" defaultChecked={filters.clutch === true} /> Clutch</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="assisted" value="true" defaultChecked={filters.assisted === true} /> Assisted</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="pullUp" value="true" defaultChecked={filters.pullUp === true} /> Pull-up</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="catchAndShoot" value="true" defaultChecked={filters.catchAndShoot === true} /> Catch-and-shoot</label>
            <input name="minExpectedPoints" defaultValue={filters.minExpectedPoints} placeholder="Min xPTS" className="rounded border border-slate-300 px-3 py-2" />
            <button className="rounded bg-ink px-3 py-2 font-black text-white">Run Search</button>
          </form>
        </FilterPanel>
        <div className="grid gap-4">
          <FilterChipBar chips={chips} />
          {result.scopeRequired ? (
            <div className="rounded border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
              <h2 className="mb-2 text-lg font-black text-ink">Choose a Player or Team</h2>
              <p>Select a player or team before running shot search. Scoping the query keeps the page fast and prevents loading the entire league shot dataset into one request.</p>
            </div>
          ) : hasShotFeed ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <MetricCard label="Attempts" value={result.meta.total} />
                <MetricCard label="Make Rate" value={formatMetric("fg_pct", result.summary.makes / Math.max(result.summary.attempts, 1))} />
                <MetricCard label="xPTS / Shot" value={(result.summary.expectedPoints / Math.max(result.summary.attempts, 1)).toFixed(2)} accent="court" />
                <MetricCard label="A - xPTS" value={result.summary.actualMinusExpected.toFixed(1)} accent="ink" />
              </div>
              <section className="grid gap-4 xl:grid-cols-2">
                <ShotChart shots={result.rows} />
                <ShotHeatmap shots={result.rows} />
              </section>
              <ShotSearchResults rows={tableRows} />
            </>
          ) : (
            <div className="rounded border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
              <h2 className="mb-2 text-lg font-black text-ink">Shot Event Feed Required</h2>
              <p>Shot search needs row-level shot events with player, team, game, location, result, and shot-context fields. The current snapshot keeps this page empty instead of producing estimated shot records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
