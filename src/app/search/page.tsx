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
import { filterShots, gameMatchupLabel, games, playerName, players, shots, teamName, teams } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
import { formatMetric } from "@/lib/metrics/format";
import { booleanParam, numberParam, singleParam, type RouteSearchParams } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const filters = {
    q: singleParam(searchParams, "q"),
    playerId: singleParam(searchParams, "playerId"),
    teamId: singleParam(searchParams, "teamId"),
    quarter: numberParam(searchParams, "quarter"),
    clutch: booleanParam(searchParams, "clutch"),
    shotZone: singleParam(searchParams, "shotZone"),
    playType: singleParam(searchParams, "playType"),
    result: singleParam(searchParams, "result") as "made" | "missed" | undefined,
    assisted: booleanParam(searchParams, "assisted"),
    pullUp: booleanParam(searchParams, "pullUp"),
    catchAndShoot: booleanParam(searchParams, "catchAndShoot"),
    minExpectedPoints: numberParam(searchParams, "minExpectedPoints"),
    minActualMinusExpected: numberParam(searchParams, "minActualMinusExpected"),
    maxActualMinusExpected: numberParam(searchParams, "maxActualMinusExpected"),
    pageSize: 120
  };
  const result = filterShots(filters);
  const hasShotFeed = shots.length > 0;
  const makes = result.rows.filter((shot) => shot.made).length;
  const expected = result.rows.reduce((sum, shot) => sum + shot.expectedPoints, 0);
  const actualMinusExpected = result.rows.reduce((sum, shot) => sum + shot.actualMinusExpected, 0);
  const tableRows = result.rows.map((shot) => {
    const game = games.find((item) => item.id === shot.gameId)!;
    const opponentId = game.homeTeamId === shot.teamId ? game.awayTeamId : game.homeTeamId;
    return {
      id: shot.id,
      date: formatShortDate(game.date),
      game: gameMatchupLabel(game),
      quarter: `Q${shot.quarter}`,
      clock: shot.clock,
      player: playerName(shot.playerId),
      team: teamName(shot.teamId),
      opponent: teamName(opponentId),
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
    .filter(([, value]) => value !== undefined && value !== "" && value !== 120)
    .map(([key, value]) => `${key}: ${value}`);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Advanced Search"
        title="Possession and Shot Search"
        description="Filter official shot and possession events when those feeds are loaded; unavailable event-only fields stay empty rather than generated."
        actions={<><ShareUrlButton /><ExportCsvButton rows={tableRows} filename="basketball-savant-shot-search.csv" /></>}
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <FilterPanel>
          <form className="grid gap-3 text-sm">
            <input name="q" defaultValue={filters.q} placeholder="Keyword" className="rounded border border-slate-300 px-3 py-2" />
            <select name="playerId" defaultValue={filters.playerId ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">All players</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
            <select name="teamId" defaultValue={filters.teamId ?? ""} className="rounded border border-slate-300 px-3 py-2">
              <option value="">All teams</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.abbreviation}</option>)}
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
          {hasShotFeed ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <MetricCard label="Attempts" value={result.meta.total} />
                <MetricCard label="Make Rate" value={formatMetric("fg_pct", makes / Math.max(result.rows.length, 1))} />
                <MetricCard label="xPTS / Shot" value={(expected / Math.max(result.rows.length, 1)).toFixed(2)} accent="court" />
                <MetricCard label="A - xPTS" value={actualMinusExpected.toFixed(1)} accent="ink" />
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
