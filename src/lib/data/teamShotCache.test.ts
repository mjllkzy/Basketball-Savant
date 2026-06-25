import { describe, expect, it } from "vitest";
import { getCachedTeamShotChart, teamShotCacheMetadata } from "@/lib/data/teamShotCache";

describe("team shot cache", () => {
  it("loads one compressed team cache without requiring the all-team JSON payload", () => {
    const shots = getCachedTeamShotChart("1610612737");

    expect(teamShotCacheMetadata.season).toBe("2025-26");
    expect(shots.length).toBeGreaterThan(7_000);
    expect(shots.every((shot) => shot.teamId === "1610612737")).toBe(true);
  });

  it("returns an empty array for an unknown team", () => {
    expect(getCachedTeamShotChart("not-a-team")).toEqual([]);
  });
});
