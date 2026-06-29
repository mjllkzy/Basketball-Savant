import { describe, expect, it } from "vitest";
import { contractSummarySortValue, summarizeContractSalaries } from "./playerContracts.server";

describe("player contract summaries", () => {
  it("summarizes full and remaining contract salary schedules", () => {
    const salaries = {
      "2025-26": 10_000_000,
      "2026-27": 12_000_000,
      "2027-28": 14_000_000,
    };

    expect(summarizeContractSalaries(salaries)).toEqual({
      years: 3,
      total: 36_000_000,
      averageAnnualValue: 12_000_000,
    });
    expect(summarizeContractSalaries(salaries, "2026-27")).toEqual({
      years: 2,
      total: 26_000_000,
      averageAnnualValue: 13_000_000,
    });
  });

  it("sorts contract summaries by years before total dollars", () => {
    const shorterLargerDeal = contractSummarySortValue({ years: 2, total: 100_000_000, averageAnnualValue: 50_000_000 });
    const longerSmallerDeal = contractSummarySortValue({ years: 3, total: 90_000_000, averageAnnualValue: 30_000_000 });

    expect(longerSmallerDeal).toBeGreaterThan(shorterLargerDeal);
  });
});
