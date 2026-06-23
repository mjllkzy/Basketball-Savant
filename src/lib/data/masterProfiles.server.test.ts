import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { players } from "@/lib/data/queries";
import {
  getMasterPlayerIndexEntry,
  hasMasterPlayerProfile,
  loadMasterPlayerProfile,
  masterPlayerIndex,
  masterProfileCategorySummary,
  masterProfileKeyStats
} from "@/lib/data/masterProfiles.server";

describe("master profile data access", () => {
  it("loads the generated public player index", () => {
    expect(masterPlayerIndex).toHaveLength(582);
    expect(masterPlayerIndex.every((entry) => entry.player_slug && entry.profile_path)).toBe(true);
  });

  it("has one generated profile file for every public player index row", () => {
    for (const entry of masterPlayerIndex) {
      const filePath = path.join(process.cwd(), "public", entry.profile_path.replace(/^\/+/, ""));
      expect(fs.existsSync(filePath), entry.player_slug).toBe(true);
    }
  });

  it("matches every app player to a generated master profile", () => {
    for (const player of players) {
      const entry = getMasterPlayerIndexEntry({ playerName: player.name });
      expect(entry, player.name).toBeTruthy();
      expect(hasMasterPlayerProfile({ slug: entry?.player_slug, playerName: player.name }), player.name).toBe(true);
    }
  });

  it("loads full player profiles without loading every profile into player tables", () => {
    const profile = loadMasterPlayerProfile("luka-doncic");
    expect(profile?.player_name).toBe("Luka Dončić");
    expect(profile?.source_sheets.length).toBeGreaterThan(20);
    expect(profile?.stat_rows).toBeGreaterThan(1000);
    expect(profile?.stats.length).toBe(profile?.stat_rows);

    const categories = profile ? masterProfileCategorySummary(profile) : [];
    expect(categories.some((category) => category.category === "General player stats")).toBe(true);

    const keyStats = profile ? masterProfileKeyStats(profile) : [];
    expect(keyStats.find((stat) => stat.label === "Points")?.value).not.toBe("N/A");
    expect(keyStats.find((stat) => stat.label === "True Shooting")?.value).toMatch(/%$/);
  });
});
