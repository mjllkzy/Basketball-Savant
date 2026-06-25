import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { searchSite } from "./search.server";

describe("database-backed command search", () => {
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

  it("finds masterfile players without loading the legacy snapshot", async () => {
    const results = await searchSite("Luka", 6);

    expect(results.some((result) => result.label === "Luka Dončić")).toBe(true);
    expect(results.every((result) => result.href.startsWith("/"))).toBe(true);
  });
});
