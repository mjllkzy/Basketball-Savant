import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listComparisonPlayerOptions, loadComparisonPlayers } from "./playerAnalytics.server";

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
});
