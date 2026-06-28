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

  it("can restrict autocomplete results to players", async () => {
    const results = await searchSite("Luka", 6, ["player"]);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.type === "player")).toBe(true);
  });

  it("can restrict autocomplete results to teams", async () => {
    const results = await searchSite("Hawks", 6, ["team"]);

    expect(results.some((result) => result.label === "Atlanta Hawks")).toBe(true);
    expect(results.every((result) => result.type === "team")).toBe(true);
  });
});
