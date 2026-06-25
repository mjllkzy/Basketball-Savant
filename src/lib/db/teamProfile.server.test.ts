import { describe, expect, it, vi } from "vitest";

vi.mock("./client.server", () => ({
  queryDatabase: vi.fn(async () => null),
}));

describe("team profile fallback", () => {
  it("builds a complete team page model without Postgres", async () => {
    const { loadTeamProfile } = await import("./teamAnalytics.server");
    const profile = await loadTeamProfile("atlanta-hawks");

    expect(profile?.team.abbreviation).toBe("ATL");
    expect(profile?.rosterRows.length).toBeGreaterThan(10);
    expect(profile?.games.length).toBeGreaterThan(80);
    expect(profile?.source).toBe("json");
  });
});
