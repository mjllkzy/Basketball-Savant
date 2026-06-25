import { describe, expect, it, vi } from "vitest";

vi.mock("./client.server", () => ({
  queryDatabase: vi.fn(async () => null),
}));

describe("custom leaderboard analytics", () => {
  it("uses compact player and team fallbacks when Postgres is unavailable", async () => {
    const { getCustomLeaderboardAnalytics } = await import("./customAnalytics.server");
    const [players, teams] = await Promise.all([
      getCustomLeaderboardAnalytics("players", ["pts", "ts_pct"]),
      getCustomLeaderboardAnalytics("teams", ["pts", "net_rating"]),
    ]);

    expect(players.source).toBe("json");
    expect(players.rows.length).toBeGreaterThan(500);
    expect(players.rows[0].values).toHaveProperty("pts");
    expect(teams.source).toBe("json");
    expect(teams.rows).toHaveLength(30);
    expect(teams.rows[0].values).toHaveProperty("net_rating");
  }, 30_000);

  it("does not fabricate lineup analytics without a verified feed", async () => {
    const { getCustomLeaderboardAnalytics } = await import("./customAnalytics.server");
    const result = await getCustomLeaderboardAnalytics("lineups", ["lineup_net_rating"]);

    expect(result.source).toBe("unavailable");
    expect(result.rows).toEqual([]);
    expect(result.message).toMatch(/verified lineup possession feed/i);
  });
});
