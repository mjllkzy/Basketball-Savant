import { describe, expect, it } from "vitest";
import {
  actualMinusExpectedPoints,
  assistRate,
  defensiveRating,
  efgPercentage,
  estimatePossessions,
  netRating,
  offensiveRating,
  paceEstimate,
  percentileRank,
  reboundConversion,
  rimFrequency,
  safeDiv,
  trueShootingPercentage,
  turnoverRate,
  usageRate
} from "@/lib/metrics/formulas";

describe("basketball formula utilities", () => {
  it("handles safe division defensively", () => {
    expect(safeDiv(10, 2)).toBe(5);
    expect(safeDiv(10, 0)).toBeNull();
    expect(safeDiv(undefined, 4)).toBeNull();
  });

  it("calculates shooting efficiency formulas", () => {
    expect(efgPercentage(40, 10, 80)).toBe(0.5625);
    expect(trueShootingPercentage(100, 80, 20)).toBeCloseTo(0.563063, 6);
  });

  it("calculates possession, ratings, pace, and usage", () => {
    expect(estimatePossessions(90, 20, 10, 14)).toBeCloseTo(102.8);
    expect(offensiveRating(112, 100)).toBeCloseTo(112);
    expect(defensiveRating(101, 100)).toBeCloseTo(101);
    expect(netRating(112, 101)).toBe(11);
    expect(paceEstimate(100, 98, 240)).toBe(99);
    expect(usageRate(20, 6, 3, 100)).toBeCloseTo(0.2564);
  });

  it("calculates event-derived rates", () => {
    expect(actualMinusExpectedPoints(12, 10.5)).toBe(1.5);
    expect(rimFrequency(12, 40)).toBe(0.3);
    expect(assistRate(8, 22)).toBeCloseTo(0.3636);
    expect(turnoverRate(4, 28)).toBeCloseTo(0.1428);
    expect(reboundConversion(11, 20)).toBe(0.55);
  });

  it("calculates percentile direction correctly", () => {
    expect(percentileRank(4, [1, 2, 3, 4, 5], true)).toBe(70);
    expect(percentileRank(4, [1, 2, 3, 4, 5], false)).toBe(30);
  });
});
