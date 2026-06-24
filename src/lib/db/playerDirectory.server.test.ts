import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listPlayerDirectory } from "./playerDirectory.server";

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
  });
});
