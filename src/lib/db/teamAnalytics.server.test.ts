import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listTeamSeasonSummaries } from "./teamAnalytics.server";

describe("database-backed team analytics", () => {
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

  it("keeps all NBA teams available through the generated fallback", async () => {
    const result = await listTeamSeasonSummaries();

    expect(result.source).toBe("json");
    expect(result.rows).toHaveLength(30);
    expect(result.rows.every((row) => row.games > 0)).toBe(true);
  }, 15_000);
});
