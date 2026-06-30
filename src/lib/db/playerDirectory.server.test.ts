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

  it("shows the 2026-27 roster overlay without carrying prior-season stats", async () => {
    const [filters, result] = await Promise.all([
      loadPlayerDirectoryFilters("Regular Season", "2026-27"),
      listPlayerDirectory({ season: "2026-27", minGames: 0, minMinutes: 0, pageSize: 1000 }),
    ]);

    expect(filters.seasons.map((option) => option.value)).toContain("2026-27");
    expect(result.meta.source).toBe("json");
    const ja = result.rows.find((row) => row.playerName === "Ja Morant");
    const jerami = result.rows.find((row) => row.playerName === "Jerami Grant");
    const kris = result.rows.find((row) => row.playerName === "Kris Murray");
    const lamelo = result.rows.find((row) => row.playerName === "LaMelo Ball");

    expect(ja?.teamAbbreviation).toBe("POR");
    expect(jerami?.teamAbbreviation).toBe("MEM");
    expect(kris?.teamAbbreviation).toBe("MEM");
    expect(lamelo?.teamAbbreviation).toBe("CHA");
    expect(ja?.games).toBe(0);
    expect(ja?.pts).toBeNull();
  }, 15_000);

  it("keeps 2025-26 player stats attached to the original teams", async () => {
    const [memphis, portland] = await Promise.all([
      listPlayerDirectory({ season: "2025-26", teamId: "1610612763", minGames: 0, minMinutes: 0, pageSize: 1000 }),
      listPlayerDirectory({ season: "2025-26", teamId: "1610612757", minGames: 0, minMinutes: 0, pageSize: 1000 }),
    ]);

    const historicalJa = memphis.rows.find((row) => row.playerName === "Ja Morant");
    expect(historicalJa?.teamAbbreviation).toBe("MEM");
    expect(historicalJa?.pts).toBeGreaterThan(0);
    expect(portland.rows.some((row) => row.playerName === "Ja Morant")).toBe(false);
  }, 15_000);
});
