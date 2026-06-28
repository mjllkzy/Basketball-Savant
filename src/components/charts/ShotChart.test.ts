import { describe, expect, it } from "vitest";
import { sampleShotsForChart, shotChartAttemptLabel } from "./ShotChart";

describe("shot chart payload helpers", () => {
  it("samples large shot sets evenly instead of taking only the first rows", () => {
    const shots = Array.from({ length: 10 }, (_, index) => ({ id: index }));

    expect(sampleShotsForChart(shots, 4).map((shot) => shot.id)).toEqual([0, 2, 5, 7]);
  });

  it("keeps the full attempt count visible when rendering a sample", () => {
    expect(shotChartAttemptLabel(120, 984)).toBe("120 shown · 984 attempts");
    expect(shotChartAttemptLabel(80, 80)).toBe("80 attempts");
  });
});
