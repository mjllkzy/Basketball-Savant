import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listPlayerDirectory, loadPlayerDirectoryFilters } from "./playerDirectory.server";

describe("database-backed player directory", () => {
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

  it("falls back to generated JSON when DATABASE_URL is absent", async () => {
    const result = await listPlayerDirectory({
      minGames: 30,
      minMinutes: 500,
      sort: "pts",
      order: "desc",
      pageSize: 10,
    });

    expect(result.meta.source).toBe("json");
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0].playerName).toBeTruthy();
    expect(result.rows[0].pts).not.toBeNull();
  }, 15_000);

  it("keeps the upcoming season selectable without showing prior-season rows", async () => {
    const [filters, result] = await Promise.all([
      loadPlayerDirectoryFilters("Regular Season", "2026-27"),
      listPlayerDirectory({ season: "2026-27", minGames: 0, minMinutes: 0, pageSize: 10 }),
    ]);

    expect(filters.seasons.map((option) => option.value)).toContain("2026-27");
    expect(result.meta.source).toBe("json");
    expect(result.rows).toHaveLength(0);
  }, 15_000);
});
