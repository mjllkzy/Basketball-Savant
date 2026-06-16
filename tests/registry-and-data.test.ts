import { describe, expect, it } from "vitest";
import { filterShots, getPlayerLeaderboard, getSimilarPlayers, players, playerSeasonAggregates, teams } from "@/lib/data/queries";
import { calculatePlayerMetric, metricRegistry } from "@/lib/metrics/registry";

describe("metric registry and seed data", () => {
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

  it("loads enough seed data for a meaningful demo", () => {
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

  it("returns similarity matches with trait explanations", () => {
    const matches = getSimilarPlayers(players[0].id, "Shot profile");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchingTraits.length).toBeGreaterThan(0);
    expect(matches[0].player.id).not.toBe(players[0].id);
  });
});
