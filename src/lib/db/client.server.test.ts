import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPlayerProfile, listPlayers, players } from "@/lib/data/queries";
import {
  closeDatabasePool,
  getDatabaseAvailability,
  getDatabasePool,
  getDatabaseUrl,
  hasDatabaseUrl,
  queryDatabase
} from "./client.server";
import { databaseTables } from "./types";

describe("database foundation", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(async () => {
    await closeDatabasePool();
    delete process.env.DATABASE_URL;
  });

  afterEach(async () => {
    await closeDatabasePool();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("reports unavailable without DATABASE_URL and does not create a pool", async () => {
    expect(getDatabaseUrl()).toBeUndefined();
    expect(hasDatabaseUrl()).toBe(false);
    expect(getDatabaseAvailability()).toEqual({
      available: false,
      reason: "missing_database_url",
      databaseUrlPresent: false,
      message: "DATABASE_URL is not configured; the app should use generated JSON data."
    });
    expect(getDatabasePool()).toBeNull();
    await expect(queryDatabase("select 1")).resolves.toBeNull();
  });

  it("can report configured availability without connecting during import", () => {
    const env = { DATABASE_URL: "postgresql://user:pass@localhost:5432/basketball_savant" };

    expect(getDatabaseUrl(env)).toBe(env.DATABASE_URL);
    expect(hasDatabaseUrl(env)).toBe(true);
    expect(getDatabaseAvailability(env)).toMatchObject({
      available: true,
      reason: "configured",
      databaseUrlPresent: true
    });
  });

  it("keeps generated JSON player data usable when the database is absent", () => {
    const result = listPlayers({ minMinutes: 500, minGames: 30, pageSize: 10 });
    const profile = getPlayerProfile("luka-doncic");

    expect(players.length).toBeGreaterThan(500);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(profile?.player.name).toBe("Luka Dončić");
  });

  it("documents the Phase 3.1 foundation tables without changing page reads", () => {
    expect(databaseTables).toEqual([
      "ingestion_runs",
      "teams",
      "players",
      "player_profiles",
      "player_season_summaries",
      "player_stat_values",
      "stat_categories",
      "column_dictionary",
      "data_issues"
    ]);
  });
});
