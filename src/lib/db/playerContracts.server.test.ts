import { describe, expect, it } from "vitest";
import {
  contractDealSummary,
  contractSummarySortValue,
  selectActiveContractDeal,
  selectNextContractDeal,
  summarizeContractSalaries,
  summarizeRemainingContract,
  type ContractDeal,
} from "./playerContracts.server";

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

  it("selects the active signed deal and tracks future extensions separately", () => {
    const activeDeal: ContractDeal = {
      source: "Spotrac",
      sourceUrl: null,
      label: "Free Agent",
      startYear: 2023,
      endYear: 2026,
      years: 4,
      total: 53_827_872,
      averageAnnualValue: 13_456_968,
      guaranteedAtSign: 53_827_872,
      totalGuaranteed: 53_827_872,
      freeAgent: "2027 / UFA",
      signedUsing: "Early Bird Rights",
      pending: false,
    };
    const futureExtension: ContractDeal = {
      source: "Spotrac",
      sourceUrl: null,
      label: "maximum (PENDING)",
      startYear: 2026,
      endYear: 2029,
      years: 4,
      total: 184_800_000,
      averageAnnualValue: 46_200_000,
      guaranteedAtSign: 184_800_000,
      totalGuaranteed: 184_800_000,
      freeAgent: "2030 / UFA",
      signedUsing: "Bird Rights",
      pending: true,
    };
    const salaries = {
      "2025-26": 13_937_574,
      "2026-27": 14_898_786,
    };

    expect(contractDealSummary(selectActiveContractDeal([futureExtension, activeDeal], "2025-26"))).toEqual({
      years: 4,
      total: 53_827_872,
      averageAnnualValue: 13_456_968,
    });
    expect(summarizeRemainingContract(salaries, activeDeal, "2025-26")).toEqual({
      years: 2,
      total: 28_836_360,
      averageAnnualValue: 14_418_180,
    });
    expect(selectNextContractDeal([futureExtension, activeDeal], "2025-26")).toBe(futureExtension);
    expect(contractDealSummary(selectActiveContractDeal([futureExtension, activeDeal], "2026-27"))).toEqual({
      years: 4,
      total: 184_800_000,
      averageAnnualValue: 46_200_000,
    });
    expect(summarizeRemainingContract(salaries, futureExtension, "2026-27")).toEqual({
      years: 4,
      total: 184_800_000,
      averageAnnualValue: 46_200_000,
    });
  });
});
