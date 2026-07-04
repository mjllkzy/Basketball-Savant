import { describe, expect, it } from "vitest";
import { closeDatabasePool } from "./client.server";
import {
  applyContractRosterSeasonOverlay,
  applyCurrentRosterContractOverlay,
  canonicalContractTeamAbbreviation,
  contractDealSummary,
  hydrateContractAnnualData,
  contractSalarySortValue,
  contractSummarySortValue,
  freeAgencyStatusForSeason,
  hasActiveContractForSeason,
  hasNonRosterContractForSeason,
  hasPendingActiveContractForSeason,
  hasTwoWayContractForSeason,
  listPlayerContracts,
  selectActiveContractDeal,
  selectNextContractDeal,
  summarizeContractSalaries,
  summarizeRemainingContract,
  summarizeTotalRemainingContract,
  type ContractDeal,
  type PlayerContractRow,
} from "./playerContracts.server";

describe("player contract summaries", () => {
  it("normalizes legacy contract team abbreviations to app team codes", () => {
    expect(canonicalContractTeamAbbreviation("BRK")).toBe("BKN");
    expect(canonicalContractTeamAbbreviation("CHO")).toBe("CHA");
    expect(canonicalContractTeamAbbreviation("PHO")).toBe("PHX");
    expect(canonicalContractTeamAbbreviation(" lal ")).toBe("LAL");
  });

  it("applies current roster trade teams only to upcoming contract seasons", () => {
    const milesBridgesRow: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "miles-bridges",
      playerName: "Miles Bridges",
      teamId: "1610612766",
      teamAbbreviation: "CHA",
      historicalTeamId: "1610612766",
      historicalTeamAbbreviation: "CHA",
      position: "SF",
      salaryBySeason: {
        "2025-26": 24_900_000,
        "2026-27": 22_826_087,
      },
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: 75_000_000,
      needsFollowup: false,
      contractDeals: [],
    };

    expect(applyCurrentRosterContractOverlay(milesBridgesRow, "2025-26")).toMatchObject({
      teamId: "1610612766",
      teamAbbreviation: "CHA",
    });
    expect(applyCurrentRosterContractOverlay(milesBridgesRow, "2026-27")).toMatchObject({
      teamId: "1610612756",
      teamAbbreviation: "PHX",
    });
  });

  it("filters 2026-27 contracts by current trade team while preserving 2025-26 team context", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    await closeDatabasePool();
    delete process.env.DATABASE_URL;

    try {
      const [phoenixUpcoming, charlotteUpcoming, charlotteHistorical] = await Promise.all([
        listPlayerContracts({ season: "2026-27", teamId: "1610612756", all: true, pageSize: 1000 }),
        listPlayerContracts({ season: "2026-27", teamId: "1610612766", all: true, pageSize: 1000 }),
        listPlayerContracts({ season: "2025-26", teamId: "1610612766", all: true, pageSize: 1000 }),
      ]);

      expect(phoenixUpcoming.rows.find((row) => row.playerSlug === "miles-bridges")).toMatchObject({
        playerName: "Miles Bridges",
        teamId: "1610612756",
        teamAbbreviation: "PHX",
      });
      expect(charlotteUpcoming.rows.some((row) => row.playerSlug === "miles-bridges")).toBe(false);
      expect(charlotteHistorical.rows.find((row) => row.playerSlug === "miles-bridges")).toMatchObject({
        playerName: "Miles Bridges",
        teamId: "1610612766",
        teamAbbreviation: "CHA",
      });
    } finally {
      await closeDatabasePool();
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }, 15_000);

  it("keeps official return agreements active while contract terms are still pending", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    await closeDatabasePool();
    delete process.env.DATABASE_URL;

    try {
      const result = await listPlayerContracts({
        season: "2026-27",
        teamId: "1610612739",
        q: "Thomas Bryant",
        all: true,
        pageSize: 1000,
      });
      const row = result.rows.find((contractRow) => contractRow.playerSlug === "thomas-bryant");

      expect(row).toBeDefined();
      expect(row).toMatchObject({
        playerName: "Thomas Bryant",
        teamId: "1610612739",
        teamAbbreviation: "CLE",
      });
      expect(row ? hasActiveContractForSeason(row, "2026-27") : false).toBe(true);
      expect(row ? hasPendingActiveContractForSeason(row, "2026-27") : false).toBe(true);
      expect(row ? freeAgencyStatusForSeason(row.contractDeals, "2026-27") : null).toBeNull();
      expect(row?.salaryBySeason["2026-27"]).toBeUndefined();
    } finally {
      await closeDatabasePool();
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }, 15_000);

  it("keeps offseason signings off the new team in historical contract roster views", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    await closeDatabasePool();
    delete process.env.DATABASE_URL;

    try {
      const [brooklynHistorical, clevelandHistorical, brooklynUpcoming] = await Promise.all([
        listPlayerContracts({ season: "2025-26", teamId: "1610612751", all: true, pageSize: 1000 }),
        listPlayerContracts({ season: "2025-26", teamId: "1610612739", all: true, pageSize: 1000 }),
        listPlayerContracts({ season: "2026-27", teamId: "1610612751", all: true, pageSize: 1000 }),
      ]);

      expect(brooklynHistorical.rows.some((row) => row.playerSlug === "keon-ellis")).toBe(false);
      expect(clevelandHistorical.rows.find((row) => row.playerSlug === "keon-ellis")).toMatchObject({
        playerName: "Keon Ellis",
        teamId: "1610612739",
        teamAbbreviation: "CLE",
      });
      expect(brooklynUpcoming.rows.find((row) => row.playerSlug === "keon-ellis")).toMatchObject({
        playerName: "Keon Ellis",
        teamId: "1610612751",
        teamAbbreviation: "BKN",
      });
    } finally {
      await closeDatabasePool();
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }, 15_000);

  it("hydrates injured roster players from the official roster fallback", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    await closeDatabasePool();
    delete process.env.DATABASE_URL;

    try {
      const result = await listPlayerContracts({ season: "2025-26", teamId: "1610612745", q: "Fred VanVleet", all: true });

      expect(result.rows.find((row) => row.playerName === "Fred VanVleet")).toMatchObject({
        playerSlug: "fred-vanvleet",
        teamId: "1610612745",
        teamAbbreviation: "HOU",
        position: "G",
      });
    } finally {
      await closeDatabasePool();
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }, 15_000);

  it("switches contract roster context by selected season", () => {
    const offseasonSigningRow: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "keon-ellis",
      playerName: "Keon Ellis",
      teamId: "1610612751",
      teamAbbreviation: "BKN",
      historicalTeamId: "1610612739",
      historicalTeamAbbreviation: "CLE",
      position: "SG",
      salaryBySeason: {
        "2025-26": 2_301_587,
        "2026-27": 8_653_846,
      },
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: 18_000_000,
      needsFollowup: true,
      contractDeals: [],
    };

    expect(applyContractRosterSeasonOverlay(offseasonSigningRow, "2025-26")).toMatchObject({
      teamId: "1610612739",
      teamAbbreviation: "CLE",
    });
    expect(applyContractRosterSeasonOverlay(offseasonSigningRow, "2026-27")).toMatchObject({
      teamId: "1610612751",
      teamAbbreviation: "BKN",
    });
  });

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

  it("hydrates missing annual salaries and options from active contract deal schedules", () => {
    const row: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "player",
      playerName: "Player",
      teamId: "TST",
      teamAbbreviation: "TST",
      historicalTeamId: null,
      historicalTeamAbbreviation: null,
      position: "G",
      salaryBySeason: { "2025-26": 12_000_000 },
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: null,
      needsFollowup: false,
      contractDeals: [{
        source: "SalarySwish",
        sourceUrl: null,
        label: "Veteran Extension",
        startYear: 2026,
        endYear: 2027,
        years: 2,
        total: 40_000_000,
        averageAnnualValue: 20_000_000,
        guaranteedAtSign: 40_000_000,
        totalGuaranteed: 40_000_000,
        freeAgent: "UFA",
        signedUsing: "Bird Exception",
        pending: true,
        salaryBySeason: {
          "2026-27": 19_000_000,
          "2027-28": 21_000_000,
        },
        optionsBySeason: {
          "2027-28": "Player Option",
        },
      }],
    };

    expect(hydrateContractAnnualData(row)).toMatchObject({
      salaryBySeason: {
        "2025-26": 12_000_000,
        "2026-27": 19_000_000,
        "2027-28": 21_000_000,
      },
      optionsBySeason: {
        "2027-28": "Player Option",
      },
    });
  });

  it("uses deal AAV as a fallback when public annual salary rows are unavailable", () => {
    const row: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "player",
      playerName: "Player",
      teamId: "TST",
      teamAbbreviation: "TST",
      historicalTeamId: null,
      historicalTeamAbbreviation: null,
      position: "G",
      salaryBySeason: {},
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: null,
      needsFollowup: true,
      contractDeals: [{
        source: "Spotrac",
        sourceUrl: null,
        label: "Veteran Contract",
        startYear: 2026,
        endYear: 2028,
        years: 3,
        total: 27_000_000,
        averageAnnualValue: 9_000_000,
        guaranteedAtSign: null,
        totalGuaranteed: null,
        freeAgent: "UFA",
        signedUsing: null,
        pending: true,
      }],
    };

    expect(hydrateContractAnnualData(row).salaryBySeason).toEqual({
      "2026-27": 9_000_000,
      "2027-28": 9_000_000,
      "2028-29": 9_000_000,
    });
  });

  it("does not overwrite imported annual salaries with deal-page schedules", () => {
    const row: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "player",
      playerName: "Player",
      teamId: "TST",
      teamAbbreviation: "TST",
      historicalTeamId: null,
      historicalTeamAbbreviation: null,
      position: "G",
      salaryBySeason: { "2026-27": 18_000_000 },
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: null,
      needsFollowup: false,
      contractDeals: [{
        source: "SalarySwish",
        sourceUrl: null,
        label: "Veteran Contract",
        startYear: 2026,
        endYear: 2026,
        years: 1,
        total: 20_000_000,
        averageAnnualValue: 20_000_000,
        guaranteedAtSign: null,
        totalGuaranteed: null,
        freeAgent: "UFA",
        signedUsing: null,
        pending: false,
        salaryBySeason: {
          "2026-27": 20_000_000,
        },
      }],
    };

    expect(hydrateContractAnnualData(row).salaryBySeason["2026-27"]).toBe(18_000_000);
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

  it("identifies active two-way contracts for the selected season", () => {
    const twoWayDeal: ContractDeal = {
      source: "Spotrac",
      sourceUrl: null,
      label: "Two-Way Contract",
      startYear: 2025,
      endYear: 2025,
      years: 1,
      total: 600_000,
      averageAnnualValue: 600_000,
      guaranteedAtSign: null,
      totalGuaranteed: null,
      freeAgent: "UFA",
      signedUsing: "Two-Way",
      pending: false,
    };
    const row: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "player",
      playerName: "Player",
      teamId: "TST",
      teamAbbreviation: "TST",
      historicalTeamId: null,
      historicalTeamAbbreviation: null,
      position: "G",
      salaryBySeason: { "2025-26": 600_000 },
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: null,
      needsFollowup: false,
      contractDeals: [twoWayDeal],
    };

    expect(hasTwoWayContractForSeason(row, "2025-26")).toBe(true);
    expect(hasTwoWayContractForSeason(row, "2026-27")).toBe(false);
    expect(hasNonRosterContractForSeason(row, "2025-26")).toBe(false);
  });

  it("identifies short-term non-roster contract rows without mislabeling standard active deals", () => {
    const tenDayDeal: ContractDeal = {
      source: "Spotrac",
      sourceUrl: null,
      label: "10-Day Contract",
      startYear: 2025,
      endYear: 2025,
      years: 1,
      total: 120_000,
      averageAnnualValue: 120_000,
      guaranteedAtSign: null,
      totalGuaranteed: null,
      freeAgent: "UFA",
      signedUsing: "10-Day",
      pending: false,
    };
    const standardDeal: ContractDeal = {
      source: "Spotrac",
      sourceUrl: null,
      label: "Veteran Contract",
      startYear: 2025,
      endYear: 2026,
      years: 2,
      total: 4_000_000,
      averageAnnualValue: 2_000_000,
      guaranteedAtSign: 4_000_000,
      totalGuaranteed: 4_000_000,
      freeAgent: "UFA",
      signedUsing: "Minimum Salary Exception",
      pending: false,
    };
    const baseRow: PlayerContractRow = {
      sourceRank: 1,
      playerSlug: "player",
      playerName: "Player",
      teamId: "TST",
      teamAbbreviation: "TST",
      historicalTeamId: null,
      historicalTeamAbbreviation: null,
      position: "G",
      salaryBySeason: { "2025-26": 120_000 },
      optionsBySeason: {},
      guaranteeStatusBySeason: {},
      guaranteedAmount: null,
      needsFollowup: false,
      contractDeals: [],
    };

    expect(hasNonRosterContractForSeason({ ...baseRow, contractDeals: [tenDayDeal] }, "2025-26")).toBe(true);
    expect(hasNonRosterContractForSeason({ ...baseRow, contractDeals: [standardDeal, tenDayDeal] }, "2025-26")).toBe(false);
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
      historicalTeamId: null,
      historicalTeamAbbreviation: null,
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
