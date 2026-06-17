import { describe, expect, it } from "vitest";
import { basketballReferencePlayerAdvancedCrosscheck, basketballReferenceTeamAdvancedCrosscheck, dataSourceMetadata, filterShots, gameContextLabel, gameMatchupLabel, games, getGameLeadingScorer, getPlayerLeaderboard, getSimilarPlayers, latestGames, lineups, listPlayers, playerGameStats, players, playerSeasonAggregates, teamGameStats, teamSeasonAggregates, teams } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
import { activeLeaderboardTabs, feedRequiredLeaderboardTabs, isLeaderboardMetricFeedRequired } from "@/lib/leaderboards";
import { calculatePlayerMetric, calculateTeamMetric, metricRegistry } from "@/lib/metrics/registry";

describe("metric registry and official data", () => {
  it("has unique metric keys and complete glossary metadata", () => {
    const keys = metricRegistry.map((metric) => metric.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const metric of metricRegistry) {
      expect(metric.label).toBeTruthy();
      expect(metric.description).toBeTruthy();
      expect(metric.formula).toBeTruthy();
      expect(metric.glossaryMarkdown).toContain(metric.formula);
    }
  });

  it("does not describe active metric documentation as synthetic or demo data", () => {
    const unavailableLanguage = /\b(synthetic|fictional|seed|demo)\b/i;
    for (const metric of metricRegistry) {
      expect(`${metric.description} ${metric.sampleQualifier} ${metric.glossaryMarkdown}`).not.toMatch(unavailableLanguage);
    }
  });

  it("loads enough official aggregate data for a meaningful app", () => {
    expect(teams.length).toBeGreaterThanOrEqual(8);
    expect(players.length).toBeGreaterThanOrEqual(80);
    expect(playerSeasonAggregates.length).toBe(players.length);
  });

  it("does not include missing player team references", () => {
    const teamIds = new Set(teams.map((team) => team.id));
    for (const player of players) {
      expect(teamIds.has(player.teamId)).toBe(true);
    }
  });

  it("loads official player bio facts for every stat-table player", () => {
    const primaryPositions = new Set(["PG", "SG", "SF", "PF", "C"]);
    expect(dataSourceMetadata.sources.playerBioStatsRegularUrl).toContain("leaguedashplayerbiostats");
    expect(dataSourceMetadata.sources.playerIndexUrl).toContain("playerindex");
    expect(dataSourceMetadata.coverage.regularSeasonPlayerBioStats).toBe(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.playerIndex).toBeGreaterThanOrEqual(players.length);
    expect(dataSourceMetadata.coverage.externalPlayerBioOverrides).toBe(6);
    for (const player of players) {
      expect(player.position).not.toBe("N/A");
      expect(primaryPositions.has(player.position)).toBe(true);
      expect(player.height).toMatch(/^\d-\d{1,2}$/);
      expect(player.weight).toBeGreaterThan(0);
      expect(typeof player.jerseyNumber).toBe("string");
    }
    expect(players.some((player) => player.jerseyNumber === "00")).toBe(true);
  });

  it("loads official NBA Stats Advanced rows and Basketball Reference cross-reference links", () => {
    expect(dataSourceMetadata.sources.playerAdvancedRegularUrl).toContain("MeasureType=Advanced");
    expect(dataSourceMetadata.sources.teamAdvancedRegularUrl).toContain("MeasureType=Advanced");
    expect(dataSourceMetadata.sources.basketballReferencePlayerAdvanced2026).toBe("https://www.basketball-reference.com/leagues/NBA_2026_advanced.html");
    expect(dataSourceMetadata.sources.basketballReferencePlayerPerGame2026).toBe("https://www.basketball-reference.com/leagues/NBA_2026_per_game.html");
    expect(dataSourceMetadata.sources.basketballReferenceGlossary).toBe("https://www.basketball-reference.com/about/glossary.html");
    expect(dataSourceMetadata.coverage.regularSeasonPlayerAdvanced).toBe(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.regularSeasonTeamAdvanced).toBe(teams.length);
    expect(dataSourceMetadata.coverage.basketballReferencePlayerAdvancedRows).toBeGreaterThan(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.basketballReferencePlayerPerGameRows).toBeGreaterThan(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.basketballReferencePlayerAdvancedCrosschecks).toBe(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.basketballReferencePlayerAdvancedMatchedCrosschecks).toBeGreaterThanOrEqual(Math.floor(playerSeasonAggregates.length * 0.95));
    expect(dataSourceMetadata.coverage.basketballReferencePrimaryPositionMatches).toBe(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.basketballReferenceTeamAdvancedRows).toBe(teams.length);
    expect(dataSourceMetadata.coverage.basketballReferenceTeamAdvancedCrosschecks).toBe(teams.length);
    expect(dataSourceMetadata.coverage.basketballReferenceTeamAdvancedMatchedCrosschecks).toBe(teams.length);
    expect(basketballReferencePlayerAdvancedCrosscheck.rows).toHaveLength(playerSeasonAggregates.length);
    expect(basketballReferenceTeamAdvancedCrosscheck.rows).toHaveLength(teams.length);

    const crosscheckIndex = Object.fromEntries(basketballReferencePlayerAdvancedCrosscheck.headers.map((header, index) => [header, index]));
    const amenCrosscheck = basketballReferencePlayerAdvancedCrosscheck.rows.find((row) => row[crosscheckIndex.PLAYER_NAME] === "Amen Thompson");
    expect(amenCrosscheck).toBeTruthy();
    expect(amenCrosscheck?.[crosscheckIndex.MATCH_STATUS]).toBe("matched");
    expect(amenCrosscheck?.[crosscheckIndex.BREF_POSITION]).toBe("PG");
    expect(amenCrosscheck?.[crosscheckIndex.BREF_TS_PCT]).toBeGreaterThan(0.59);
    expect(amenCrosscheck?.[crosscheckIndex.TS_PCT_ABS_DIFF]).toBeLessThan(0.001);
    expect(amenCrosscheck?.[crosscheckIndex.EFG_PCT_ABS_DIFF]).toBeLessThan(0.001);

    const initialsCrosscheck = basketballReferencePlayerAdvancedCrosscheck.rows.find((row) => row[crosscheckIndex.PLAYER_NAME] === "AJ Green");
    expect(initialsCrosscheck?.[crosscheckIndex.MATCH_STATUS]).toBe("matched");
    expect(initialsCrosscheck?.[crosscheckIndex.BREF_POSITION]).toBe("SG");
    expect(initialsCrosscheck?.[crosscheckIndex.TS_PCT_ABS_DIFF]).toBeLessThan(0.001);

    expect(players.find((player) => player.name === "Shai Gilgeous-Alexander")?.position).toBe("PG");
    expect(players.find((player) => player.name === "Donovan Mitchell")?.position).toBe("SG");
    expect(players.find((player) => player.name === "Nikola Jokić")?.position).toBe("C");

    const teamCrosscheckIndex = Object.fromEntries(basketballReferenceTeamAdvancedCrosscheck.headers.map((header, index) => [header, index]));
    const clippersCrosscheck = basketballReferenceTeamAdvancedCrosscheck.rows.find((row) => row[teamCrosscheckIndex.NBA_TEAM_NAME] === "LA Clippers");
    expect(clippersCrosscheck?.[teamCrosscheckIndex.BREF_TEAM_NAME]).toBe("Los Angeles Clippers");
    expect(clippersCrosscheck?.[teamCrosscheckIndex.MATCH_STATUS]).toBe("matched");
    expect(clippersCrosscheck?.[teamCrosscheckIndex.TS_PCT_ABS_DIFF]).toBe(0);
    expect(clippersCrosscheck?.[teamCrosscheckIndex.EFG_PCT_ABS_DIFF]).toBe(0);

    const playerRow = playerSeasonAggregates.find((aggregate) => aggregate.usagePct !== null && aggregate.officialTsPct !== null && aggregate.officialEfgPct !== null);
    expect(playerRow).toBeTruthy();
    expect(calculatePlayerMetric("ts_pct", playerRow!)).toBe(playerRow!.officialTsPct);
    expect(calculatePlayerMetric("efg_pct", playerRow!)).toBe(playerRow!.officialEfgPct);
    expect(calculatePlayerMetric("usage_rate", playerRow!)).toBe(playerRow!.usagePct);
    expect(calculatePlayerMetric("ast_pct", playerRow!)).toBe(playerRow!.assistPct);
    expect(calculatePlayerMetric("off_rating", playerRow!)).toBe(playerRow!.offRating);
    expect(calculatePlayerMetric("def_rating", playerRow!)).toBe(playerRow!.defRating);
    expect(calculatePlayerMetric("net_rating", playerRow!)).toBe(playerRow!.netRating);
    expect(calculatePlayerMetric("pie", playerRow!)).toBe(playerRow!.pie);
    expect(calculatePlayerMetric("possessions", playerRow!)).toBe(playerRow!.onCourtPossessions);

    const teamRow = teamSeasonAggregates.find((aggregate) => aggregate.officialTsPct !== null && aggregate.officialEfgPct !== null);
    expect(teamRow).toBeTruthy();
    expect(calculateTeamMetric("ts_pct", teamRow!)).toBe(teamRow!.officialTsPct);
    expect(calculateTeamMetric("efg_pct", teamRow!)).toBe(teamRow!.officialEfgPct);
    expect(calculateTeamMetric("pace", teamRow!)).toBe(teamRow!.pace);
    expect(calculateTeamMetric("possessions", teamRow!)).toBe(teamRow!.possessions);
  });

  it("does not fabricate official game IDs, scores, or game-log rows from season aggregates", () => {
    expect(games.every((game) => !game.id.startsWith("official-team-summary-"))).toBe(true);
    expect(playerGameStats.every((line) => !line.gameId.startsWith("official-team-summary-"))).toBe(true);
    expect(teamGameStats.every((line) => !line.gameId.startsWith("official-team-summary-"))).toBe(true);
    if (dataSourceMetadata.coverage.regularSeasonTeamGameLogs + dataSourceMetadata.coverage.playoffTeamGameLogs === 0) {
      expect(games).toHaveLength(0);
      expect(teamGameStats).toHaveLength(0);
    }
    if (dataSourceMetadata.coverage.regularSeasonPlayerGameLogs + dataSourceMetadata.coverage.playoffPlayerGameLogs === 0) {
      expect(playerGameStats).toHaveLength(0);
      expect(playerSeasonAggregates.every((row) => row.recentGameScores.length === 0)).toBe(true);
    }
  });

  it("maps loaded official game-log rows into real games and player trends", () => {
    const loadedTeamGameRows = dataSourceMetadata.coverage.regularSeasonTeamGameLogs + dataSourceMetadata.coverage.playoffTeamGameLogs;
    const loadedPlayerGameRows = dataSourceMetadata.coverage.regularSeasonPlayerGameLogs + dataSourceMetadata.coverage.playoffPlayerGameLogs;
    const teamIds = new Set(teams.map((team) => team.id));

    if (loadedTeamGameRows > 0) {
      expect(teamGameStats).toHaveLength(loadedTeamGameRows);
      expect(games.length).toBe(loadedTeamGameRows / 2);
      expect(latestGames(5)).toHaveLength(5);
      expect(games.some((game) => game.neutralSite)).toBe(true);
      for (const game of games) {
        expect(teamIds.has(game.homeTeamId)).toBe(true);
        expect(teamIds.has(game.awayTeamId)).toBe(true);
        expect(game.homeScore).toBeGreaterThanOrEqual(0);
        expect(game.awayScore).toBeGreaterThanOrEqual(0);
        expect(game.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }

    if (loadedPlayerGameRows > 0) {
      expect(playerGameStats.length).toBeGreaterThan(0);
      expect(playerSeasonAggregates.some((row) => row.recentGameScores.length > 0)).toBe(true);
      const gameIds = new Set(games.map((game) => game.id));
      for (const row of playerSeasonAggregates) {
        for (const recent of row.recentGameScores) {
          expect(gameIds.has(recent.gameId)).toBe(true);
          expect(recent.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it("cross-checks displayed 2026 Finals games against public reference sources", () => {
    expect(dataSourceMetadata.sources.nbaFinalsGame5BoxScore).toBe("https://www.nba.com/game/0042500405/box-score");
    expect(dataSourceMetadata.sources.basketballReferenceFinalsGame5).toBe("https://www.basketball-reference.com/boxscores/202606130SAS.html");
    expect(dataSourceMetadata.sources.espnFinalsGame5).toContain("gameId/401859967");
    expect(dataSourceMetadata.publicReferenceGames).toEqual([
      expect.objectContaining({
        gameId: "0042500405",
        date: "2026-06-13",
        awayTeam: "New York Knicks",
        awayScore: 94,
        homeTeam: "San Antonio Spurs",
        homeScore: 90
      }),
      expect.objectContaining({
        gameId: "0042500404",
        date: "2026-06-10",
        awayTeam: "San Antonio Spurs",
        awayScore: 106,
        homeTeam: "New York Knicks",
        homeScore: 107
      }),
      expect.objectContaining({
        gameId: "0042500403",
        date: "2026-06-08",
        awayTeam: "San Antonio Spurs",
        awayScore: 115,
        homeTeam: "New York Knicks",
        homeScore: 111
      }),
      expect.objectContaining({
        gameId: "0042500402",
        date: "2026-06-05",
        awayTeam: "New York Knicks",
        awayScore: 105,
        homeTeam: "San Antonio Spurs",
        homeScore: 104
      }),
      expect.objectContaining({
        gameId: "0042500401",
        date: "2026-06-03",
        awayTeam: "New York Knicks",
        awayScore: 105,
        homeTeam: "San Antonio Spurs",
        homeScore: 95
      })
    ]);

    const latestReferenceGameIds = dataSourceMetadata.publicReferenceGames.map((reference) => reference.gameId);
    expect(latestGames(5).map((game) => game.id)).toEqual(latestReferenceGameIds);
    for (const reference of dataSourceMetadata.publicReferenceGames) {
      expect(reference.sources.nba).toContain(reference.gameId);
      expect(reference.sources.basketballReference).toContain("basketball-reference.com/boxscores/");
      expect(reference.sources.espn).toContain("espn.com/nba/game/_/gameId/");
      const game = games.find((item) => item.id === reference.gameId);
      expect(game).toMatchObject({
        date: reference.date,
        seasonType: "Playoffs",
        awayTeamId: reference.awayTeamId,
        homeTeamId: reference.homeTeamId,
        awayScore: reference.awayScore,
        homeScore: reference.homeScore,
        status: "Final"
      });
      expect(game ? gameMatchupLabel(game) : "").toBe(`${reference.awayTeam} at ${reference.homeTeam}`);
    }
  });

  it("formats displayed dates as month/day/two-digit-year", () => {
    expect(formatShortDate("2026-06-13")).toBe("6/13/26");
    expect(formatShortDate("2026-06-13T00:00:00")).toBe("6/13/26");
  });

  it("gets game leading scorers from official player game logs", () => {
    const game = latestGames(1)[0];
    const gameLines = game ? playerGameStats.filter((line) => line.gameId === game.id) : [];
    if (gameLines.length === 0) return;

    const leader = getGameLeadingScorer(game!.id);
    const maxPoints = Math.max(...gameLines.map((line) => line.pts));
    expect(leader).not.toBeNull();
    expect(leader?.points).toBe(maxPoints);
    expect(leader?.player.name).toBeTruthy();
    expect(leader?.team.abbreviation).toBeTruthy();
  });

  it("labels game context from official season type and playoff game IDs", () => {
    expect(gameContextLabel(games.find((game) => game.id === "0042500405")!)).toBe("NBA Finals Game 5");
    expect(gameContextLabel(games.find((game) => game.id === "0042500301")!)).toBe("ECF Game 1");
    expect(gameContextLabel(games.find((game) => game.id === "0042500317")!)).toBe("WCF Game 7");

    const regularSeasonGame = games.find((game) => game.seasonType === "Regular Season");
    expect(regularSeasonGame).toBeTruthy();
    expect(gameContextLabel(regularSeasonGame!)).toBe("Regular Season");
  });

  it("uses real team conference metadata instead of one default value", () => {
    expect(new Set(teams.map((team) => team.conference))).toEqual(new Set(["East", "West"]));
    expect(teams.every((team) => team.division !== "NBA")).toBe(true);
  });

  it("preserves official multi-word team nicknames", () => {
    expect(teams.find((team) => team.abbreviation === "POR")).toMatchObject({
      city: "Portland",
      name: "Trail Blazers",
      slug: "portland-trail-blazers"
    });
  });
});

describe("query behavior", () => {
  it("returns a valid empty shot result when no official shot-event feed is loaded", () => {
    const firstTeam = teams[0];
    const result = filterShots({ teamId: firstTeam.id, shotZone: "Rim", result: "made", pageSize: 100 });
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.length).toBe(0);
    expect(result.meta.total).toBe(0);
  });

  it("sorts leaderboards in descending metric order", () => {
    const rows = getPlayerLeaderboard("pts", { limit: 20 });
    const values = rows.map((row) => row.value ?? 0);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it("filters player tables by minimum total minutes and games played", () => {
    const result = listPlayers({ minMinutes: 500, minGames: 30, pageSize: 100 });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.minutes >= 500 && row.games >= 30)).toBe(true);
  });

  it("filters broad legacy position groups against primary Basketball Reference positions", () => {
    const guards = listPlayers({ position: "G", minMinutes: 500, minGames: 30, pageSize: 100 });
    const pointGuards = listPlayers({ position: "PG", minMinutes: 500, minGames: 30, pageSize: 100 });
    expect(guards.rows.length).toBeGreaterThan(pointGuards.rows.length);
    expect(guards.rows.every((row) => row.player.position === "PG" || row.player.position === "SG")).toBe(true);
    expect(pointGuards.rows.every((row) => row.player.position === "PG")).toBe(true);
  });

  it("keeps default leaderboard tabs on loaded official metrics", () => {
    for (const tab of activeLeaderboardTabs) {
      expect(isLeaderboardMetricFeedRequired(tab.metricKey)).toBe(false);
      expect(getPlayerLeaderboard(tab.metricKey, { limit: 10 }).some((row) => row.value !== null)).toBe(true);
    }
    for (const tab of feedRequiredLeaderboardTabs) {
      expect(isLeaderboardMetricFeedRequired(tab.metricKey)).toBe(true);
      expect(getPlayerLeaderboard(tab.metricKey, { limit: 10 }).every((row) => row.value === null)).toBe(true);
    }
  });

  it("calculates custom metric values from aggregate rows", () => {
    const row = playerSeasonAggregates[0];
    expect(calculatePlayerMetric("efg_pct", row)).toBeGreaterThan(0);
    expect(calculatePlayerMetric("ts_pct", row)).toBeGreaterThan(0);
    expect(calculatePlayerMetric("usage_rate", row)).toBeGreaterThan(0);
    expect(calculatePlayerMetric("oreb_pct", row)).toBeGreaterThanOrEqual(0);
    expect(calculatePlayerMetric("dreb_pct", row)).toBeGreaterThanOrEqual(0);
    expect(calculatePlayerMetric("reb_pct", row)).toBeGreaterThanOrEqual(0);
    expect(calculatePlayerMetric("shot_quality", row)).toBeNull();
  });

  it("keeps event, tracking, model, location, and lineup metrics unavailable without real feeds", () => {
    expect(lineups).toHaveLength(0);
    const row = playerSeasonAggregates[0];
    const metricByKey = new Map(metricRegistry.map((metric) => [metric.key, metric]));
    for (const key of ["expected_fg_pct", "shot_quality", "actual_minus_expected_points", "transition_ppp", "lineup_net_rating", "average_speed", "touches_per_75", "frontcourt_touches", "boxouts", "rim_pressure_score", "rim_protection_value", "passes_per_touch", "points_created_by_assist", "rim_frequency", "corner_three_frequency", "rolling_75_possessions"]) {
      expect(metricByKey.get(key)?.requiresTracking).toBe(true);
      expect(metricByKey.get(key)?.glossaryMarkdown).toContain("required event, lineup, model, or tracking feed");
      expect(calculatePlayerMetric(key, row)).toBeNull();
      expect(getPlayerLeaderboard(key, { limit: 5 }).every((leader) => leader.value === null)).toBe(true);
    }
    const teamRow = teamSeasonAggregates[0];
    for (const key of ["shot_quality", "expected_points_per_shot", "rim_frequency", "corner_three_frequency", "above_break_three_frequency"]) {
      expect(calculateTeamMetric(key, teamRow)).toBeNull();
    }
  });

  it("calculates recent-game windows from official player game logs when loaded", () => {
    if (dataSourceMetadata.coverage.regularSeasonPlayerGameLogs + dataSourceMetadata.coverage.playoffPlayerGameLogs === 0) return;
    const row = playerSeasonAggregates.find((aggregate) => aggregate.recentGameScores.length >= 10);
    expect(row).toBeTruthy();
    const lastFive = row!.recentGameScores.slice(-5);
    const lastTen = row!.recentGameScores.slice(-10);
    expect(row!.recentGameScores.length).toBeLessThanOrEqual(30);
    expect(calculatePlayerMetric("last_5_games", row!)).toBeCloseTo(lastFive.reduce((sum, game) => sum + game.pts, 0) / lastFive.length);
    expect(calculatePlayerMetric("last_10_games", row!)).toBeCloseTo(lastTen.reduce((sum, game) => sum + game.pts, 0) / lastTen.length);
    expect(calculatePlayerMetric("last_30_games", row!)).toBeGreaterThanOrEqual(0);
    expect(row!.recentGameScores.some((game) => game.usage > 0)).toBe(true);
  });

  it("returns similarity matches with trait explanations", () => {
    const matches = getSimilarPlayers(players[0].id, "Shot profile");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchingTraits.length).toBeGreaterThan(0);
    expect(matches[0].player.id).not.toBe(players[0].id);
  });
});
