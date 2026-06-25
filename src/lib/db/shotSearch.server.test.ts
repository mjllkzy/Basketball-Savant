import { describe, expect, it, vi } from "vitest";

vi.mock("./client.server", () => ({
  queryDatabase: vi.fn(async () => null),
}));

describe("scoped shot search", () => {
  it("requires a player or team scope before loading shot rows", async () => {
    const { searchShotAnalytics } = await import("./shotSearch.server");
    const result = await searchShotAnalytics({ pageSize: 10 });

    expect(result.scopeRequired).toBe(true);
    expect(result.rows).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it("loads only the selected team's generated shot cache", async () => {
    const { searchShotAnalytics } = await import("./shotSearch.server");
    const result = await searchShotAnalytics({
      teamId: "1610612737",
      pageSize: 10,
      sort: "expectedPoints",
      order: "desc",
    });

    expect(result.scopeRequired).toBe(false);
    expect(result.source).toBe("json");
    expect(result.meta.total).toBeGreaterThan(1_000);
    expect(result.rows).toHaveLength(10);
    expect(result.rows.every((shot) => shot.teamId === "1610612737")).toBe(true);
    expect(result.summary.attempts).toBe(result.meta.total);
    expect(result.summary.makes).toBeGreaterThan(0);
  }, 30_000);
});
