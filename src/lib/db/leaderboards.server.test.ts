import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listPlayerLeaderboard } from "./leaderboards.server";

describe("database-backed leaderboards", () => {
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

  it("preserves generated leaderboards when Postgres is unavailable", async () => {
    const result = await listPlayerLeaderboard("pts", 10);

    expect(result.source).toBe("json");
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0].value).not.toBeNull();
    expect(result.rows.every((row) => row.playerSlug.length > 0)).toBe(true);
  }, 30_000);
});
