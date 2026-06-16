import { describe, expect, it } from "vitest";
import { dataSourceMetadata, filterShots, gameMatchupLabel, games, getPlayerLeaderboard, getSimilarPlayers, latestGames, lineups, playerGameStats, players, playerSeasonAggregates, teamGameStats, teamSeasonAggregates, teams } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/date";
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
    expect(dataSourceMetadata.sources.playerBioStatsRegularUrl).toContain("leaguedashplayerbiostats");
    expect(dataSourceMetadata.sources.playerIndexUrl).toContain("playerindex");
    expect(dataSourceMetadata.coverage.regularSeasonPlayerBioStats).toBe(playerSeasonAggregates.length);
    expect(dataSourceMetadata.coverage.playerIndex).toBeGreaterThanOrEqual(players.length);
    expect(dataSourceMetadata.coverage.externalPlayerBioOverrides).toBe(6);
    for (const player of players) {
      expect(player.position).not.toBe("N/A");
      expect(player.height).toMatch(/^\d-\d{1,2}$/);
      expect(player.weight).toBeGreaterThan(0);
      expect(typeof player.jerseyNumber).toBe("string");
    }
    expect(players.some((player) => player.jerseyNumber === "00")).toBe(true);
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

  it("cross-checks the 2026 Finals clincher against public reference sources", () => {
    expect(dataSourceMetadata.sources.nbaFinalsGame5BoxScore).toBe("https://www.nba.com/game/0042500405/box-score");
    expect(dataSourceMetadata.sources.basketballReferenceFinalsGame5).toBe("https://www.basketball-reference.com/boxscores/202606130SAS.html");
    expect(dataSourceMetadata.sources.espnFinalsGame5).toContain("gameId/401859967");
    const finalsGame5 = games.find((game) => game.id === "0042500405");
    expect(finalsGame5).toMatchObject({
      date: "2026-06-13",
      seasonType: "Playoffs",
      awayTeamId: "1610612752",
      homeTeamId: "1610612759",
      awayScore: 94,
      homeScore: 90,
      status: "Final"
    });
    expect(finalsGame5 ? gameMatchupLabel(finalsGame5) : "").toBe("New York Knicks at San Antonio Spurs");
  });

  it("formats displayed dates as month/day/two-digit-year", () => {
    expect(formatShortDate("2026-06-13")).toBe("6/13/26");
    expect(formatShortDate("2026-06-13T00:00:00")).toBe("6/13/26");
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

  it("calculates custom metric values from aggregate rows", () => {
    const row = playerSeasonAggregates[0];
    expect(calculatePlayerMetric("efg_pct", row)).toBeGreaterThan(0);
    expect(calculatePlayerMetric("ts_pct", row)).toBeGreaterThan(0);
    expect(calculatePlayerMetric("shot_quality", row)).toBeNull();
  });

  it("keeps event, tracking, model, location, and lineup metrics unavailable without real feeds", () => {
    expect(lineups).toHaveLength(0);
    const row = playerSeasonAggregates[0];
    for (const key of ["expected_fg_pct", "shot_quality", "actual_minus_expected_points", "transition_ppp", "lineup_net_rating", "average_speed", "touches_per_75", "frontcourt_touches", "boxouts", "rim_pressure_score", "rim_protection_value", "passes_per_touch", "points_created_by_assist", "rim_frequency", "corner_three_frequency", "rolling_75_possessions"]) {
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
  });

  it("returns similarity matches with trait explanations", () => {
    const matches = getSimilarPlayers(players[0].id, "Shot profile");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchingTraits.length).toBeGreaterThan(0);
    expect(matches[0].player.id).not.toBe(players[0].id);
  });
});
