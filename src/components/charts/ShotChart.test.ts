import { describe, expect, it } from "vitest";
import type { Shot } from "@/lib/types";
import { sampleShotsForChart, shotChartAttemptLabel } from "./ShotChart";
import { courtPoint } from "./BasketballCourt";
import { shotZoneStats } from "./ShotZoneLayer";

describe("shot chart payload helpers", () => {
  it("samples large shot sets evenly instead of taking only the first rows", () => {
    const shots = Array.from({ length: 10 }, (_, index) => ({ id: index }));

    expect(sampleShotsForChart(shots, 4).map((shot) => shot.id)).toEqual([0, 2, 5, 7]);
  });

  it("keeps the full attempt count visible when rendering a sample", () => {
    expect(shotChartAttemptLabel(120, 984)).toBe("120 shown · 984 attempts");
    expect(shotChartAttemptLabel(80, 80)).toBe("80 attempts");
  });

  it("plots NBA coordinates from the rim origin inside the visible court", () => {
    expect(courtPoint(0, 0)).toEqual({ cx: 250, cy: 94 });
    expect(courtPoint(-23.8, -1).cx).toBeCloseTo(35.8);
    expect(courtPoint(-23.8, -1).cy).toBeCloseTo(85.6);
    expect(courtPoint(0, 73.4).cy).toBeCloseTo(444.7);
  });

  it("summarizes shot zone efficiency for hover overlays", () => {
    const stats = shotZoneStats([
      { shotZone: "Rim", made: true, pointsValue: 2 },
      { shotZone: "Rim", made: false, pointsValue: 2 },
      { shotZone: "Above Break Three", made: true, pointsValue: 3 }
    ] as Shot[]);

    expect(stats.find((stat) => stat.zone === "Rim")).toMatchObject({
      attempts: 2,
      made: 1,
      fgPct: 0.5,
      efgPct: 0.5
    });
    expect(stats.find((stat) => stat.zone === "Above Break Three")).toMatchObject({
      attempts: 1,
      made: 1,
      fgPct: 1,
      efgPct: 1.5
    });
  });
});
