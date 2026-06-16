import { describe, expect, it } from "vitest";

import { formatMetric, formatPercentage, toPercentagePoints } from "@/lib/metrics/format";

describe("metric formatting", () => {
  it("formats percentage metrics after converting to percentage points", () => {
    expect(formatMetric("ts_pct", 0.8543)).toBe("85.4%");
    expect(formatMetric("efg_pct", 0.61234)).toBe("61.2%");
    expect(formatMetric("usage_rate", 0.195)).toBe("19.5%");
  });

  it("handles unavailable values", () => {
    expect(formatMetric("ts_pct", null)).toBe("N/A");
    expect(formatMetric("ts_pct", Number.NaN)).toBe("N/A");
  });

  it("keeps non-percentage precision unchanged", () => {
    expect(formatMetric("pts", 27.345)).toBe("27.3");
    expect(formatMetric("points_per_shot", 1.234)).toBe("1.23");
  });

  it("shares percentage conversion helpers for non-registry UI displays", () => {
    expect(toPercentagePoints(0.5537)).toBe(55.4);
    expect(formatPercentage(0.5537)).toBe("55.4%");
  });
});
