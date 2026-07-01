import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listComparisonPlayerOptions, loadAllComparisonPlayers, loadComparisonPlayers, loadPlayerProfileAnalytics } from "./playerAnalytics.server";

describe("database-backed player analytics", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(async () => {
    await closeDatabasePool();
    delete process.env.DATABASE_URL;
  });

  afterEach(async () => {
    await closeDatabasePool();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("keeps comparison selectors and profiles available through the generated fallback", async () => {
    const options = await listComparisonPlayerOptions();
    const profiles = await loadComparisonPlayers(["luka-doncic", "nikola-jokic"]);

    expect(options.length).toBeGreaterThan(500);
    expect(profiles.map((profile) => profile.player.name)).toEqual(["Luka Dončić", "Nikola Jokić"]);
    expect(profiles.every((profile) => profile.aggregate.games > 0)).toBe(true);
  }, 15_000);

  it("uses the 2026-27 roster overlay in comparison and API fallback rows", async () => {
    const [upcoming, historical] = await Promise.all([
      loadAllComparisonPlayers("Regular Season", "2026-27"),
      loadAllComparisonPlayers("Regular Season", "2025-26"),
    ]);

    const upcomingCarter = upcoming.rows.find((row) => row.player.slug === "devin-carter");
    const historicalCarter = historical.rows.find((row) => row.player.slug === "devin-carter");

    expect(upcoming.source).toBe("json");
    expect(upcomingCarter?.team.abbreviation).toBe("ATL");
    expect(upcomingCarter?.aggregate.season).toBe("2026-27");
    expect(upcomingCarter?.aggregate.games).toBe(0);
    expect(upcomingCarter?.aggregate.pts).toBe(0);
    expect(historicalCarter?.team.abbreviation).toBe("SAC");
    expect(historicalCarter?.aggregate.season).toBe("2025-26");
    expect(historicalCarter?.aggregate.games).toBe(38);
    expect(historicalCarter?.aggregate.pts).toBeGreaterThan(300);
  }, 15_000);

  it("preserves canonical and legacy player profile URLs without Postgres", async () => {
    const [canonical, legacy] = await Promise.all([
      loadPlayerProfileAnalytics("luka-doncic"),
      loadPlayerProfileAnalytics("luka-don-i-1629029"),
    ]);

    expect(canonical?.player.name).toBe("Luka Dončić");
    expect(legacy?.player.name).toBe("Luka Dončić");
    expect(canonical?.gameLog.length).toBeGreaterThan(60);
  }, 15_000);
});
