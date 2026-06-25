import { describe, expect, it } from "vitest";
import { filterShotCollection } from "./shotFilters";
import { getCachedTeamShotChart } from "./teamShotCache";

describe("shot collection filters", () => {
  it("filters and paginates a compressed team cache", () => {
    const shots = getCachedTeamShotChart("1610612737");
    const result = filterShotCollection(shots, {
      result: "made",
      shotZone: "Rim",
      pageSize: 10,
    });

    expect(result.rows).toHaveLength(10);
    expect(result.meta.total).toBeGreaterThan(100);
    expect(result.rows.every((shot) => shot.made && shot.shotZone === "Rim")).toBe(true);
  });
});
