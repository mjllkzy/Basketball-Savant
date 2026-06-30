import { describe, expect, it, vi } from "vitest";

vi.mock("./client.server", () => ({
  queryDatabase: vi.fn(async () => null),
}));

describe("team profile fallback", () => {
  it("builds a complete team page model without Postgres", async () => {
    const { loadTeamProfile } = await import("./teamAnalytics.server");
    const profile = await loadTeamProfile("atlanta-hawks");

    expect(profile).toBeDefined();
    if (!profile) throw new Error("Expected Atlanta Hawks profile");

    expect(profile.team.abbreviation).toBe("ATL");
    expect(profile.rosterRows.length).toBeGreaterThan(10);
    expect(profile.games.length).toBeGreaterThan(80);
    expect(profile.shots.length).toBeGreaterThan(7_000);
    expect(profile.shots.every((shot) => shot.teamId === profile.team.id)).toBe(true);
    expect(profile.source).toBe("json");
  });

  it("uses 2026-27 roster affiliation without moving 2025-26 stats", async () => {
    const { loadTeamProfile } = await import("./teamAnalytics.server");
    const [upcomingPortland, upcomingMemphis, historicalMemphis] = await Promise.all([
      loadTeamProfile("portland-trail-blazers", "Regular Season", "2026-27"),
      loadTeamProfile("memphis-grizzlies", "Regular Season", "2026-27"),
      loadTeamProfile("memphis-grizzlies", "Regular Season", "2025-26"),
    ]);

    expect(upcomingPortland?.rosterRows.some((row) => row.playerName === "Ja Morant")).toBe(true);
    expect(upcomingPortland?.rosterRows.some((row) => row.playerName === "Jerami Grant")).toBe(false);
    expect(upcomingMemphis?.rosterRows.some((row) => row.playerName === "Jerami Grant")).toBe(true);
    expect(upcomingMemphis?.rosterRows.some((row) => row.playerName === "Kris Murray")).toBe(true);
    expect(upcomingMemphis?.rosterRows.some((row) => row.playerName === "Ja Morant")).toBe(false);
    expect(upcomingPortland?.rosterRows.find((row) => row.playerName === "Ja Morant")?.games).toBe(0);

    const historicalJa = historicalMemphis?.rosterRows.find((row) => row.playerName === "Ja Morant");
    expect(historicalJa?.teamAbbreviation).toBe("MEM");
    expect(historicalJa?.pts).toBeGreaterThan(0);
  });
});
