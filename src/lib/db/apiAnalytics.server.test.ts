import { describe, expect, it, vi } from "vitest";

vi.mock("./client.server", () => ({
  queryDatabase: vi.fn(async () => null),
}));

describe("Postgres-first API analytics adapters", () => {
  it("preserves the nested player API contract with generated fallback data", async () => {
    const { listPlayerApiRecords } = await import("./apiAnalytics.server");
    const result = await listPlayerApiRecords({
      minGames: 30,
      minMinutes: 500,
      sort: "pts",
      order: "desc",
      pageSize: 5,
    });

    expect(result.meta.source).toBe("json");
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0].player.name).toBeTruthy();
    expect(result.rows[0].team.abbreviation).toBeTruthy();
    expect(result.rows[0].season).toBe("2025-26");
    expect(result.rows[0].pts).toBeGreaterThan(0);
  }, 30_000);

  it("sorts positions in basketball order and leaves missing values at the bottom", async () => {
    const { listPlayerApiRecords } = await import("./apiAnalytics.server");
    const positions = await listPlayerApiRecords({
      sort: "position",
      order: "asc",
      all: true,
    });
    const points = await listPlayerApiRecords({
      sort: "pts",
      order: "desc",
      all: true,
    });

    const positionOrder = ["PG", "SG", "SF", "PF", "C"];
    const observed = Array.from(new Set(positions.rows.map((row) => row.player.position)))
      .filter((position) => positionOrder.includes(position));
    expect(observed).toEqual(positionOrder);

    const firstMissing = points.rows.findIndex((row) => row.games === 0 || !Number.isFinite(row.pts));
    if (firstMissing >= 0) {
      expect(points.rows.slice(firstMissing).every((row) => row.games === 0 || !Number.isFinite(row.pts))).toBe(true);
    }
  }, 30_000);

  it("keeps team and leaderboard endpoint records available without Postgres", async () => {
    const { listLeaderboardApiRecords, listTeamApiRecords } = await import("./apiAnalytics.server");
    const [teams, leaders] = await Promise.all([
      listTeamApiRecords({ pageSize: 5 }),
      listLeaderboardApiRecords("pts", { limit: 5, minGames: 30 }),
    ]);

    expect(teams.meta.source).toBe("json");
    expect(teams.meta.total).toBe(30);
    expect(teams.rows).toHaveLength(5);
    expect(leaders.source).toBe("json");
    expect(leaders.rows).toHaveLength(5);
    expect(leaders.rows[0].player.name).toBeTruthy();
    expect(leaders.rows[0].aggregate.season).toBe("2025-26");
  }, 30_000);
});
