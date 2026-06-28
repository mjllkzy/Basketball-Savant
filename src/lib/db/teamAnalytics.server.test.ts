import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import { listTeamSeasonSummaries, loadTeamSeasonSummaryFilters } from "./teamAnalytics.server";

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

  it("filters generated team summaries by conference, division, and month", async () => {
    const filters = await loadTeamSeasonSummaryFilters();
    const month = filters.months[0]?.value;

    expect(filters.conferences.map((option) => option.value)).toContain("East");
    expect(filters.divisions.map((option) => option.value)).toContain("Atlantic");
    expect(month).toMatch(/^\d{4}-\d{2}$/);

    const east = await listTeamSeasonSummaries({ conference: "East" });
    expect(east.rows.length).toBeGreaterThan(0);
    expect(east.rows.every((row) => row.team.conference === "East")).toBe(true);

    const atlantic = await listTeamSeasonSummaries({ division: "Atlantic" });
    expect(atlantic.rows.length).toBeGreaterThan(0);
    expect(atlantic.rows.every((row) => row.team.division === "Atlantic")).toBe(true);

    const monthly = await listTeamSeasonSummaries({ month });
    expect(monthly.rows.length).toBeGreaterThan(0);
    expect(monthly.rows.every((row) => row.games > 0 && row.games < 82)).toBe(true);
    expect(monthly.rows.every((row) => row.officialTsPct !== null && row.officialTsPct > 0 && row.officialTsPct < 1)).toBe(true);
    expect(monthly.rows.every((row) => row.officialEfgPct !== null && row.officialEfgPct > 0 && row.officialEfgPct < 1)).toBe(true);
    expect(monthly.rows.every((row) => row.pace > 50 && row.pace < 130)).toBe(true);
  }, 15_000);
});
