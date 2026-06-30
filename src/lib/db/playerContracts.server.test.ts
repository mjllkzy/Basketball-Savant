import { describe, expect, it } from "vitest";
import {
  contractDealSummary,
  contractSalarySortValue,
  contractSummarySortValue,
  freeAgencyStatusForSeason,
  selectActiveContractDeal,
  selectNextContractDeal,
  summarizeContractSalaries,
  summarizeRemainingContract,
  summarizeTotalRemainingContract,
  type ContractDeal,
  type PlayerContractRow,
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

  it("rolls signed future extensions into the remaining contract summary", () => {
    const activeDeal: ContractDeal = {
      source: "SalarySwish",
      sourceUrl: null,
      label: "Veteran Extension Maximum Contract",
      startYear: 2022,
      endYear: 2025,
      years: 4,
      total: 215_353_662,
      averageAnnualValue: 53_838_416,
      guaranteedAtSign: 215_353_662,
      totalGuaranteed: 215_353_662,
      freeAgent: "UFA",
      signedUsing: "Bird Exception",
      pending: false,
    };
    const futureExtension: ContractDeal = {
      source: "SalarySwish",
      sourceUrl: null,
      label: "Veteran Extension",
      startYear: 2026,
      endYear: 2026,
      years: 1,
      total: 62_587_158,
      averageAnnualValue: 62_587_158,
      guaranteedAtSign: 62_587_158,
      totalGuaranteed: 62_587_158,
      freeAgent: "UFA",
      signedUsing: "Bird Exception",
      pending: false,
    };
    const salaries = {
      "2025-26": 59_606_817,
      "2026-27": 62_587_158,
    };

    expect(summarizeRemainingContract(salaries, activeDeal, "2025-26")).toEqual({
      years: 1,
      total: 59_606_817,
      averageAnnualValue: 59_606_817,
    });
    expect(summarizeTotalRemainingContract(salaries, [futureExtension, activeDeal], "2025-26")).toEqual({
      years: 2,
      total: 122_193_975,
      averageAnnualValue: 61_096_987.5,
    });
  });

  it("truncates the current deal before a same-year future extension starts", () => {
    const activeDeal: ContractDeal = {
      source: "SalarySwish",
      sourceUrl: null,
      label: "Veteran Contract",
      startYear: 2023,
      endYear: 2026,
      years: 4,
      total: 53_827_872,
      averageAnnualValue: 13_456_968,
      guaranteedAtSign: 53_827_872,
      totalGuaranteed: 53_827_872,
      freeAgent: "UFA",
      signedUsing: "Early Bird Rights",
      pending: false,
    };
    const futureExtension: ContractDeal = {
      source: "SalarySwish",
      sourceUrl: null,
      label: "Veteran Extension Maximum Contract",
      startYear: 2026,
      endYear: 2029,
      years: 4,
      total: 185_000_000,
      averageAnnualValue: 46_250_000,
      guaranteedAtSign: 185_000_000,
      totalGuaranteed: 185_000_000,
      freeAgent: "UFA",
      signedUsing: "Bird Rights",
      pending: false,
    };
    const salaries = {
      "2025-26": 13_937_574,
      "2026-27": 14_898_786,
    };

    expect(summarizeTotalRemainingContract(salaries, [futureExtension, activeDeal], "2025-26")).toEqual({
      years: 5,
      total: 198_937_574,
      averageAnnualValue: 39_787_514.8,
    });
  });

  it("labels players without remaining years as free agents for the selected season", () => {
    const unrestrictedDeal: ContractDeal = {
      source: "SalarySwish",
      sourceUrl: null,
      label: "Veteran Contract",
      startYear: 2024,
      endYear: 2025,
      years: 2,
      total: 40_000_000,
      averageAnnualValue: 20_000_000,
      guaranteedAtSign: 40_000_000,
      totalGuaranteed: 40_000_000,
      freeAgent: "2026 / UFA",
      signedUsing: "Bird Rights",
      pending: false,
    };
    const restrictedDeal: ContractDeal = {
      ...unrestrictedDeal,
      freeAgent: "RFA",
    };
    const activeDeal: ContractDeal = {
      ...unrestrictedDeal,
      startYear: 2026,
      endYear: 2027,
      freeAgent: "2028 / UFA",
    };

    expect(summarizeTotalRemainingContract({}, [unrestrictedDeal], "2026-27")).toBeNull();
    expect(freeAgencyStatusForSeason([unrestrictedDeal], "2026-27")).toBe("Unrestricted FA");
    expect(freeAgencyStatusForSeason([restrictedDeal], "2026-27")).toBe("Restricted FA");
    expect(freeAgencyStatusForSeason([activeDeal, unrestrictedDeal], "2026-27")).toBeNull();
  });

  it("sorts free agents below real salaries using prior-year salary as a tie-breaker", () => {
    const expiredDeal: ContractDeal = {
      source: "SalarySwish",
      sourceUrl: null,
      label: "Veteran Contract",
      startYear: 2024,
      endYear: 2025,
      years: 2,
      total: 40_000_000,
      averageAnnualValue: 20_000_000,
      guaranteedAtSign: 40_000_000,
      totalGuaranteed: 40_000_000,
      freeAgent: "UFA",
      signedUsing: "Bird Rights",
      pending: false,
    };
    const baseRow: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "player",
      playerName: "Player",
      teamId: "TST",
      teamAbbreviation: "TST",
      position: "G",
      salaryBySeason: {},
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: null,
      needsFollowup: false,
      contractDeals: [expiredDeal],
    };
    const cheapFreeAgent = { ...baseRow, playerName: "Cheap FA", salaryBySeason: { "2025-26": 2_000_000 } };
    const expensiveFreeAgent = { ...baseRow, playerName: "Expensive FA", salaryBySeason: { "2025-26": 20_000_000 } };
    const signedPlayer = { ...baseRow, playerName: "Signed Player", salaryBySeason: { "2026-27": 1_000_000 }, contractDeals: [] };

    const sorted = [signedPlayer, expensiveFreeAgent, cheapFreeAgent].sort((left, right) =>
      contractSalarySortValue(left, "2026-27")! - contractSalarySortValue(right, "2026-27")!,
    );

    expect(sorted.map((row) => row.playerName)).toEqual(["Cheap FA", "Expensive FA", "Signed Player"]);
  });
});
