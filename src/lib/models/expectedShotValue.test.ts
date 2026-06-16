import { describe, expect, it } from "vitest";
import { expectedShotValue, type ExpectedShotInput } from "@/lib/models/expectedShotValue";

const base: ExpectedShotInput = {
  shotDistance: 8,
  shotZone: "Short Midrange",
  pointsValue: 2,
  defenderDistance: 4,
  touchTime: 3,
  dribblesBeforeShot: 2,
  shotClock: 12,
  playerSkill: 0,
  playType: "Handoff",
  transition: false,
  catchAndShoot: false,
  pullUp: false,
  quarter: 2,
  clutch: false
};

describe("expected shot value model", () => {
  it("rates open rim shots above contested long twos", () => {
    const rim = expectedShotValue({ ...base, shotZone: "Rim", shotDistance: 2, defenderDistance: 7, playType: "Cut" });
    const longTwo = expectedShotValue({ ...base, shotZone: "Long Midrange", shotDistance: 20, defenderDistance: 1.5, playType: "Isolation", pullUp: true });
    expect(rim.expectedFgPct).toBeGreaterThan(longTwo.expectedFgPct);
  });

  it("rates open corner threes above contested midrange in expected points", () => {
    const corner = expectedShotValue({ ...base, shotZone: "Corner Three", pointsValue: 3, shotDistance: 23, defenderDistance: 7, catchAndShoot: true, playType: "Spot-Up" });
    const mid = expectedShotValue({ ...base, shotZone: "Long Midrange", pointsValue: 2, shotDistance: 19, defenderDistance: 1, pullUp: true });
    expect(corner.expectedPoints).toBeGreaterThan(mid.expectedPoints);
  });

  it("penalizes late-clock contested attempts", () => {
    const normal = expectedShotValue({ ...base, defenderDistance: 5, shotClock: 14 });
    const late = expectedShotValue({ ...base, defenderDistance: 1.5, shotClock: 3, clutch: true });
    expect(late.expectedFgPct).toBeLessThan(normal.expectedFgPct);
  });

  it("allows player skill to slightly adjust expectations", () => {
    const low = expectedShotValue({ ...base, playerSkill: -0.5 });
    const high = expectedShotValue({ ...base, playerSkill: 0.8 });
    expect(high.expectedFgPct).toBeGreaterThan(low.expectedFgPct);
  });
});
