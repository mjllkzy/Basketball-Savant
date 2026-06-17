import { PercentileRadar } from "@/components/charts/PercentileRadar";
import { PlayerGameTrendChart, ScoringLeadersChart, TeamStyleMatrix, type LeaderPoint, type PlayerTrendPoint, type TeamStylePoint } from "@/components/charts/OfficialVisualCharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { dataSourceMetadata, gameContextLabel, gameMatchupLabel, getGameLeadingScorer, getPlayerProfile, latestGames, lineups, passes, playerSeasonAggregates, players, possessions, shots, teamGameStats, teamSeasonAggregates } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
import { formatMetric, toPercentagePoints } from "@/lib/metrics/format";
import { trueShootingPercentage } from "@/lib/metrics/formulas";
import { calculatePlayerMetric, calculateTeamMetric, getMetric } from "@/lib/metrics/registry";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";
import { normalizeVisualTab, visualTabs, type VisualTab } from "@/lib/visuals";

function fixed(value: number | null | undefined, precision = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? "N/A" : value.toFixed(precision);
}

function numberValue(value: number | null | undefined, precision = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? 0 : Number(value.toFixed(precision));
}

function pctValue(value: number | null | undefined, precision = 1) {
  return numberValue(toPercentagePoints(value, precision), precision);
}

function defaultPlayerSlug() {
  return [...playerSeasonAggregates]
    .filter((row) => row.games > 0 && row.recentGameScores.length > 0)
    .sort((a, b) => b.pts / b.games - a.pts / a.games)[0]?.player.slug ?? players[0].slug;
}

function playerPicker(tab: VisualTab, selectedSlug: string) {
  const options = [...playerSeasonAggregates]
    .filter((row) => row.games > 0)
    .sort((a, b) => b.pts / b.games - a.pts / a.games)
    .slice(0, 90);

  return (
    <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="tab" value={tab} />
      <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        Player
        <select name="player" defaultValue={selectedSlug} className="min-h-10 rounded border border-slate-300 px-3 text-sm font-semibold normal-case tracking-normal text-ink">
          {options.map((row) => (
            <option key={row.player.id} value={row.player.slug}>
              {row.player.name} · {row.team.abbreviation}
            </option>
          ))}
        </select>
      </label>
      <button className="min-h-10 rounded bg-ink px-4 text-sm font-black text-white sm:self-end">Apply</button>
    </form>
  );
}

export default function VisualsPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const tab = normalizeVisualTab(singleParam(searchParams, "tab"));
  const requestedPlayer = singleParam(searchParams, "player") ?? defaultPlayerSlug();
  const selectedProfile = getPlayerProfile(requestedPlayer) ?? getPlayerProfile(defaultPlayerSlug())!;
  const coverage = dataSourceMetadata.coverage;
  const loadedGames = Math.round((coverage.regularSeasonTeamGameLogs + coverage.playoffTeamGameLogs) / 2);

  const teamStyleData: TeamStylePoint[] = teamSeasonAggregates.map((row) => ({
    team: row.team.abbreviation,
    name: `${row.team.city} ${row.team.name}`,
    pace: numberValue(calculateTeamMetric("pace", row), 1),
    efgPct: pctValue(calculateTeamMetric("efg_pct", row), 1),
    netRating: numberValue(calculateTeamMetric("net_rating", row), 1),
    offensiveRating: numberValue(calculateTeamMetric("off_rating", row), 1),
    defensiveRating: numberValue(calculateTeamMetric("def_rating", row), 1)
  }));

  const qualifiedPlayers = playerSeasonAggregates
    .filter((row) => row.games >= 20 && row.minutes / Math.max(row.games, 1) >= 10)
    .sort((a, b) => b.pts / b.games - a.pts / a.games);

  const leaderData: LeaderPoint[] = qualifiedPlayers.slice(0, 14).map((row) => ({
    player: row.player.name,
    team: row.team.abbreviation,
    ppg: numberValue(row.pts / row.games, 1),
    tsPct: pctValue(calculatePlayerMetric("ts_pct", row), 1)
  }));

  const trendData: PlayerTrendPoint[] = selectedProfile.aggregate.recentGameScores.slice(-18).map((row) => ({
    date: formatShortDate(row.date),
    pts: numberValue(row.pts, 0),
    tsPct: pctValue(row.ts, 1),
    usagePct: pctValue(row.usage, 1),
    net: numberValue(row.net, 1)
  }));

  const radarKeys = ["pts", "ts_pct", "efg_pct", "usage_rate", "ast_pct", "reb_pct", "stocks", "pie"];
  const radarData = radarKeys.map((key) => ({
    metric: getMetric(key).shortLabel,
    percentile: selectedProfile.metricValues.find((metricValue) => metricValue.metricKey === key)?.percentile ?? 0
  }));

  const recentGameRows = latestGames(10).map((game) => {
    const leader = getGameLeadingScorer(game.id);
    return {
      date: formatShortDate(game.date),
      context: gameContextLabel(game),
      matchup: gameMatchupLabel(game),
      href: `/games/${game.id}`,
      score: `${game.awayScore}-${game.homeScore}`,
      scorer: leader ? `${leader.player.name} · ${leader.points} PTS` : "N/A"
    };
  });

  const playerGameRows = selectedProfile.gameLog.slice(0, 12).map((line) => ({
    date: formatShortDate(line.game.date),
    opp: line.opponent.abbreviation,
    pts: line.pts,
    reb: line.reb,
    ast: line.ast,
    ts: formatMetric("ts_pct", trueShootingPercentage(line.pts, line.fga, line.fta)),
    pm: line.plusMinus
  }));

  const leaderRows = qualifiedPlayers.slice(0, 30).map((row, index) => ({
    rank: index + 1,
    player: row.player.name,
    href: `/players/${row.player.slug}`,
    team: row.team.abbreviation,
    g: row.games,
    mpg: fixed(row.minutes / row.games, 1),
    ppg: fixed(row.pts / row.games, 1),
    ts: formatMetric("ts_pct", calculatePlayerMetric("ts_pct", row)),
    usg: formatMetric("usage_rate", calculatePlayerMetric("usage_rate", row))
  }));

  const coverageRows = [
    { feed: "Player aggregates", source: "NBA Stats", status: "Loaded", rows: coverage.regularSeasonPlayerStats + coverage.playoffPlayerStats },
    { feed: "Team aggregates", source: "NBA Stats", status: "Loaded", rows: coverage.regularSeasonTeamStats + coverage.playoffTeamStats },
    { feed: "Basketball Reference cross-checks", source: "Basketball Reference", status: "Loaded", rows: coverage.basketballReferencePlayerAdvancedMatchedCrosschecks + coverage.basketballReferenceTeamAdvancedMatchedCrosschecks },
    { feed: "Player game logs", source: "NBA Stats", status: "Loaded", rows: coverage.regularSeasonPlayerGameLogs + coverage.playoffPlayerGameLogs },
    { feed: "Team game logs", source: "NBA Stats", status: "Loaded", rows: teamGameStats.length },
    { feed: "Shot charts", source: "NBA Stats shot chart feed", status: shots.length ? "Loaded" : "Not loaded", rows: shots.length },
    { feed: "Possession / play-by-play", source: "Event feed", status: possessions.length ? "Loaded" : "Not loaded", rows: possessions.length },
    { feed: "Passes / touches", source: "Tracking feed", status: passes.length ? "Loaded" : "Not loaded", rows: passes.length },
    { feed: "Lineups", source: "Lineup stint feed", status: lineups.length ? "Loaded" : "Not loaded", rows: lineups.length }
  ];

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Visualization Studio"
        title="Visuals"
        description="Official NBA Stats and Basketball Reference cross-checks rendered into team, player, scoring, trend, and data-coverage views."
      />

      <div className="table-scroll flex gap-2 overflow-x-auto">
        {visualTabs.map((item) => (
          <a key={item} href={`/visuals?tab=${encodeURIComponent(item)}${item === "Player Trends" || item === "Player Radar" ? `&player=${selectedProfile.player.slug}` : ""}`} className={`shrink-0 rounded border px-3 py-2 text-sm font-bold ${tab === item ? "border-signal bg-white text-signal" : "border-slate-200 bg-white text-slate-600"}`}>
            {item}
          </a>
        ))}
      </div>

      {tab === "Overview" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Players" value={coverage.regularSeasonPlayerStats} sublabel="Official regular-season rows" />
            <MetricCard label="Teams" value={coverage.regularSeasonTeamStats} sublabel="Official team rows" accent="ink" />
            <MetricCard label="Games" value={loadedGames} sublabel="Official game-log matchups" accent="court" />
            <MetricCard label="Player Logs" value={coverage.regularSeasonPlayerGameLogs + coverage.playoffPlayerGameLogs} sublabel="Official player-game rows" />
          </section>
          <section className="grid gap-4 xl:grid-cols-2">
            <TeamStyleMatrix data={teamStyleData} />
            <ScoringLeadersChart data={leaderData} />
          </section>
          <StatTable columns={[{ key: "date", label: "Date" }, { key: "context", label: "Context" }, { key: "matchup", label: "Matchup", hrefKey: "href" }, { key: "score", label: "Score" }, { key: "scorer", label: "Leading Scorer" }]} rows={recentGameRows} />
        </>
      ) : null}

      {tab === "Team Style" ? (
        <>
          <TeamStyleMatrix data={teamStyleData} />
          <StatTable
            columns={[
              { key: "team", label: "Team" },
              { key: "pace", label: "Pace", align: "right" },
              { key: "efg", label: "eFG%", align: "right" },
              { key: "ortg", label: "ORtg", align: "right" },
              { key: "drtg", label: "DRtg", align: "right" },
              { key: "net", label: "Net", align: "right" }
            ]}
            rows={[...teamStyleData].sort((a, b) => b.netRating - a.netRating).map((row) => ({ team: row.name, pace: row.pace, efg: `${row.efgPct}%`, ortg: row.offensiveRating, drtg: row.defensiveRating, net: row.netRating }))}
          />
        </>
      ) : null}

      {tab === "Player Trends" ? (
        <>
          {playerPicker(tab, selectedProfile.player.slug)}
          <PlayerGameTrendChart data={trendData} playerName={selectedProfile.player.name} />
          <StatTable columns={[{ key: "date", label: "Date" }, { key: "opp", label: "Opp" }, { key: "pts", label: "PTS", align: "right" }, { key: "reb", label: "REB", align: "right" }, { key: "ast", label: "AST", align: "right" }, { key: "ts", label: "TS%", align: "right" }, { key: "pm", label: "+/-", align: "right" }]} rows={playerGameRows} />
        </>
      ) : null}

      {tab === "Player Radar" ? (
        <>
          {playerPicker(tab, selectedProfile.player.slug)}
          <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <PercentileRadar data={radarData} />
            <StatTable columns={[{ key: "metric", label: "Metric" }, { key: "value", label: "Value", align: "right" }, { key: "pct", label: "Pctile", align: "right" }]} rows={radarKeys.map((key) => {
              const metric = getMetric(key);
              const value = selectedProfile.metricValues.find((metricValue) => metricValue.metricKey === key);
              return { metric: metric.label, value: formatMetric(key, value?.value ?? null), pct: value?.percentile ?? 0 };
            })} />
          </section>
        </>
      ) : null}

      {tab === "Scoring Leaders" ? (
        <>
          <ScoringLeadersChart data={leaderData} />
          <StatTable columns={[{ key: "rank", label: "Rk", align: "right" }, { key: "player", label: "Player", hrefKey: "href" }, { key: "team", label: "Team" }, { key: "g", label: "G", align: "right" }, { key: "mpg", label: "MPG", align: "right" }, { key: "ppg", label: "PPG", align: "right" }, { key: "ts", label: "TS%", align: "right" }, { key: "usg", label: "USG%", align: "right" }]} rows={leaderRows} />
        </>
      ) : null}

      {tab === "Data Coverage" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="NBA Stats Snapshot" value={dataSourceMetadata.generatedAt.slice(0, 10)} sublabel={dataSourceMetadata.season} accent="ink" />
            <MetricCard label="BR Player Matches" value={coverage.basketballReferencePlayerAdvancedMatchedCrosschecks} sublabel="Advanced rows cross-checked" />
            <MetricCard label="Shot Events" value={shots.length} sublabel="Unavailable in current snapshot" accent="court" />
            <MetricCard label="Tracking Events" value={passes.length + possessions.length + lineups.length} sublabel="Requires connected feed" />
          </section>
          <StatTable columns={[{ key: "feed", label: "Feed" }, { key: "source", label: "Source" }, { key: "status", label: "Status" }, { key: "rows", label: "Rows", align: "right" }]} rows={coverageRows} />
        </>
      ) : null}
    </div>
  );
}
