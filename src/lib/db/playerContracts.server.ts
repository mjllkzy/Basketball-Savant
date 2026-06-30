import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadRuntimeFallbacks, type RuntimePlayerFallback } from "@/lib/data/runtimeFallbacks.server";
import { officialTeams } from "@/lib/data/official";
import { DEFAULT_SEASON, parseSeason } from "@/lib/seasons";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/playerContracts.server.ts can only be imported on the server.");
}

export const contractSeasons = ["2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;

export type ContractSeason = (typeof contractSeasons)[number];

export type PlayerContractRow = {
  sourceRank: number;
  playerSlug: string | null;
  playerName: string;
  teamId: string;
  teamAbbreviation: string;
  position: string | null;
  salaryBySeason: Partial<Record<ContractSeason, number>>;
  optionsBySeason: Partial<Record<ContractSeason, string>>;
  guaranteeStatusBySeason: Partial<Record<ContractSeason, string>>;
  guaranteedAmount: number | null;
  needsFollowup: boolean;
  contractDeals: ContractDeal[];
};

export type ContractSummary = {
  years: number;
  total: number;
  averageAnnualValue: number;
};

export type FreeAgencyStatus = "Unrestricted FA" | "Restricted FA" | "Free Agent";

export type ContractDeal = {
  source: string;
  sourceUrl: string | null;
  label: string;
  startYear: number;
  endYear: number;
  years: number;
  total: number | null;
  averageAnnualValue: number | null;
  guaranteedAtSign: number | null;
  totalGuaranteed: number | null;
  freeAgent: string | null;
  signedUsing: string | null;
  pending: boolean;
};

export type PlayerContractResult = {
  rows: PlayerContractRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    source: "postgres" | "json";
  };
};

export type PlayerContractParams = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  q?: string;
  teamId?: string;
  position?: string;
  season?: string;
  sort?: string;
  order?: "asc" | "desc";
};

type ContractJsonRow = {
  source_rank: number;
  player_name: string;
  matched_player_slug?: string | null;
  matched_player_name?: string | null;
  team_abbreviation: string;
  salaries: Record<string, number>;
  guaranteed?: number | null;
  options_by_season?: Record<string, string> | null;
  guarantee_status_by_season?: Record<string, string> | null;
  needs_followup?: boolean | null;
};

type ContractJsonPayload = {
  contracts: ContractJsonRow[];
};

type ContractDealJsonRow = {
  source_rank: number;
  player_name: string;
  matched_player_slug?: string | null;
  matched_player_name?: string | null;
  team_abbreviation: string;
  deals?: Array<{
    source?: string | null;
    source_url?: string | null;
    label?: string | null;
    start_year?: number | string | null;
    end_year?: number | string | null;
    years?: number | string | null;
    total?: number | string | null;
    average_annual_value?: number | string | null;
    guaranteed_at_sign?: number | string | null;
    total_guaranteed?: number | string | null;
    free_agent?: string | null;
    signed_using?: string | null;
    pending?: boolean | null;
  }>;
};

type ContractDealJsonPayload = {
  contracts: ContractDealJsonRow[];
};

type ContractDealLookup = {
  byRank: Map<number, ContractDeal[]>;
  bySlug: Map<string, ContractDeal[]>;
  byNameTeam: Map<string, ContractDeal[]>;
};

type PlayerContractDbRow = {
  source_rank: number | string;
  player_slug: string | null;
  player_name: string;
  source_player_name: string;
  team_id: string | null;
  team_abbreviation: string;
  position: string | null;
  salary_by_season: unknown;
  options_by_season: unknown;
  guarantee_status_by_season: unknown;
  guaranteed_amount: number | string | null;
  needs_followup: boolean | null;
};

const teamByAbbreviation = new Map(officialTeams.map((team) => [team.abbreviation, team]));
let contractDealLookupPromise: Promise<ContractDealLookup> | null = null;

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function contractSeason(value: string | null | undefined): ContractSeason {
  const season = parseSeason(value);
  return contractSeasons.includes(season as ContractSeason) ? season as ContractSeason : DEFAULT_SEASON;
}

function numberRecord(value: unknown): Partial<Record<ContractSeason, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([season]) => contractSeasons.includes(season as ContractSeason))
      .map(([season, amount]) => [season, numeric(amount as number | string | null)])
      .filter((entry): entry is [ContractSeason, number] => entry[1] !== null),
  );
}

function stringRecord(value: unknown): Partial<Record<ContractSeason, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([season, label]) => contractSeasons.includes(season as ContractSeason) && typeof label === "string" && label.trim().length > 0)
      .map(([season, label]) => [season, String(label).trim()]),
  ) as Partial<Record<ContractSeason, string>>;
}

function playerLookup(players: RuntimePlayerFallback[]) {
  return new Map(players.map((player) => [player.player_slug, player]));
}

function normalizedContractName(value: string) {
  const asciiText = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const tokens = asciiText.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  while (tokens.length > 0 && ["jr", "sr", "ii", "iii", "iv", "v"].includes(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

function dealLookupKey(playerName: string, teamAbbreviation: string) {
  return `${normalizedContractName(playerName)}|${teamAbbreviation}`;
}

function jsonDealToContractDeal(deal: NonNullable<ContractDealJsonRow["deals"]>[number]): ContractDeal | null {
  const startYear = numeric(deal.start_year);
  const endYear = numeric(deal.end_year);
  const years = numeric(deal.years);
  if (!startYear || !endYear || !years) return null;
  return {
    source: deal.source?.trim() || "Spotrac",
    sourceUrl: deal.source_url?.trim() || null,
    label: deal.label?.trim() || "",
    startYear,
    endYear,
    years,
    total: numeric(deal.total),
    averageAnnualValue: numeric(deal.average_annual_value),
    guaranteedAtSign: numeric(deal.guaranteed_at_sign),
    totalGuaranteed: numeric(deal.total_guaranteed),
    freeAgent: deal.free_agent?.trim() || null,
    signedUsing: deal.signed_using?.trim() || null,
    pending: Boolean(deal.pending),
  };
}

async function loadContractDealLookup(): Promise<ContractDealLookup> {
  if (!contractDealLookupPromise) {
    contractDealLookupPromise = readFile(path.join(process.cwd(), "data", "raw", "player_contract_deals_2025_2031.json"), "utf8")
      .then((source) => {
        const payload = JSON.parse(source) as ContractDealJsonPayload;
        const byRank = new Map<number, ContractDeal[]>();
        const bySlug = new Map<string, ContractDeal[]>();
        const byNameTeam = new Map<string, ContractDeal[]>();
        for (const row of payload.contracts ?? []) {
          const deals = (row.deals ?? []).map(jsonDealToContractDeal).filter((deal): deal is ContractDeal => deal !== null);
          if (deals.length === 0) continue;
          const sourceRank = numeric(row.source_rank);
          if (sourceRank !== null) byRank.set(sourceRank, deals);
          if (row.matched_player_slug) bySlug.set(row.matched_player_slug, deals);
          byNameTeam.set(dealLookupKey(row.matched_player_name || row.player_name, row.team_abbreviation), deals);
        }
        return { byRank, bySlug, byNameTeam };
      })
      .catch(() => ({ byRank: new Map(), bySlug: new Map(), byNameTeam: new Map() }));
  }
  return contractDealLookupPromise;
}

function attachContractDeals(rows: PlayerContractRow[], lookup: ContractDealLookup) {
  return rows.map((row) => ({
    ...row,
    contractDeals:
      lookup.byRank.get(row.sourceRank) ??
      (row.playerSlug ? lookup.bySlug.get(row.playerSlug) : undefined) ??
      lookup.byNameTeam.get(dealLookupKey(row.playerName, row.teamAbbreviation)) ??
      [],
  }));
}

function dbRowToContract(row: PlayerContractDbRow): PlayerContractRow {
  const team = teamByAbbreviation.get(row.team_abbreviation);
  return {
    sourceRank: numeric(row.source_rank) ?? 0,
    playerSlug: row.player_slug,
    playerName: row.player_name || row.source_player_name,
    teamId: row.team_id ?? team?.id ?? row.team_abbreviation,
    teamAbbreviation: row.team_abbreviation,
    position: row.position,
    salaryBySeason: numberRecord(row.salary_by_season),
    optionsBySeason: stringRecord(row.options_by_season),
    guaranteeStatusBySeason: stringRecord(row.guarantee_status_by_season),
    guaranteedAmount: numeric(row.guaranteed_amount),
    needsFollowup: Boolean(row.needs_followup),
    contractDeals: [],
  };
}

function jsonRowToContract(row: ContractJsonRow, playersBySlug: Map<string, RuntimePlayerFallback>): PlayerContractRow {
  const player = row.matched_player_slug ? playersBySlug.get(row.matched_player_slug) : undefined;
  const team = teamByAbbreviation.get(row.team_abbreviation);
  return {
    sourceRank: row.source_rank,
    playerSlug: row.matched_player_slug ?? null,
    playerName: player?.player_name ?? row.matched_player_name ?? row.player_name,
    teamId: team?.id ?? row.team_abbreviation,
    teamAbbreviation: row.team_abbreviation,
    position: player?.position ?? null,
    salaryBySeason: numberRecord(row.salaries),
    optionsBySeason: stringRecord(row.options_by_season),
    guaranteeStatusBySeason: stringRecord(row.guarantee_status_by_season),
    guaranteedAmount: row.guaranteed ?? null,
    needsFollowup: Boolean(row.needs_followup),
    contractDeals: [],
  };
}

function positionMatches(rowPosition: string | null, requestedPosition?: string) {
  if (!requestedPosition) return true;
  const positions = requestedPosition === "G" ? ["PG", "SG"] : requestedPosition === "F" ? ["SF", "PF"] : [requestedPosition];
  return positions.includes(rowPosition ?? "");
}

function selectedSeasonSalary(row: PlayerContractRow, season: ContractSeason) {
  return row.salaryBySeason[season] ?? null;
}

function seasonStartYear(season: ContractSeason) {
  return Number(season.slice(0, 4));
}

function seasonFromStartYear(year: number) {
  return contractSeasons.find((season) => seasonStartYear(season) === year);
}

export function summarizeContractSalaries(salaries: Partial<Record<ContractSeason, number>>, fromSeason?: ContractSeason, throughSeason?: ContractSeason): ContractSummary | null {
  const startIndex = fromSeason ? contractSeasons.indexOf(fromSeason) : 0;
  const endIndex = throughSeason ? contractSeasons.indexOf(throughSeason) : contractSeasons.length - 1;
  const seasons = contractSeasons
    .slice(Math.max(0, startIndex), Math.max(startIndex, endIndex) + 1)
    .map((season) => salaries[season])
    .filter((amount): amount is number => typeof amount === "number" && Number.isFinite(amount));
  if (seasons.length === 0) return null;
  const total = seasons.reduce((sum, amount) => sum + amount, 0);
  return {
    years: seasons.length,
    total,
    averageAnnualValue: total / seasons.length,
  };
}

export function contractSummarySortValue(summary: ContractSummary | null) {
  if (!summary) return null;
  return summary.years * 1_000_000_000_000 + summary.total;
}

function previousSalaryBeforeSeason(salaries: Partial<Record<ContractSeason, number>>, season: ContractSeason) {
  const seasonIndex = contractSeasons.indexOf(season);
  for (let index = seasonIndex - 1; index >= 0; index -= 1) {
    const amount = salaries[contractSeasons[index]];
    if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  }
  return 0;
}

export function contractDealSummary(deal: ContractDeal | null): ContractSummary | null {
  if (!deal?.total || !deal.years) return null;
  return {
    years: deal.years,
    total: deal.total,
    averageAnnualValue: deal.averageAnnualValue ?? deal.total / deal.years,
  };
}

export function selectActiveContractDeal(deals: ContractDeal[], season: ContractSeason) {
  const year = seasonStartYear(season);
  const activeDeals = deals
    .filter((deal) => deal.startYear <= year && deal.endYear >= year)
    .sort((left, right) => right.startYear - left.startYear || right.endYear - left.endYear || Number(right.pending) - Number(left.pending));
  return activeDeals[0] ?? null;
}

export function selectNextContractDeal(deals: ContractDeal[], season: ContractSeason) {
  const year = seasonStartYear(season);
  const nextDeals = deals
    .filter((deal) => deal.startYear > year)
    .sort((left, right) => left.startYear - right.startYear || right.endYear - left.endYear);
  return nextDeals[0] ?? null;
}

function normalizedFreeAgencyStatus(value: string | null | undefined): FreeAgencyStatus | null {
  const normalized = value?.toUpperCase() ?? "";
  if (!normalized) return null;
  if (/\bRFA\b/.test(normalized) || normalized.includes("RESTRICTED")) return "Restricted FA";
  if (/\bUFA\b/.test(normalized) || normalized.includes("UNRESTRICTED")) return "Unrestricted FA";
  if (/\bFA\b/.test(normalized) || normalized.includes("FREE AGENT")) return "Free Agent";
  return null;
}

export function freeAgencyStatusForSeason(deals: ContractDeal[], season: ContractSeason): FreeAgencyStatus | null {
  const year = seasonStartYear(season);
  if (selectActiveContractDeal(deals, season)) return null;

  const expiredDeals = deals
    .filter((deal) => deal.endYear < year)
    .sort((left, right) => right.endYear - left.endYear || right.startYear - left.startYear);

  return normalizedFreeAgencyStatus(expiredDeals[0]?.freeAgent);
}

export function contractSalarySortValue(row: PlayerContractRow, season: ContractSeason) {
  const salary = selectedSeasonSalary(row, season);
  if (salary !== null) return salary;
  if (!freeAgencyStatusForSeason(row.contractDeals, season)) return null;
  return -1_000_000_000_000 + previousSalaryBeforeSeason(row.salaryBySeason, season);
}

export function selectRemainingContractDeals(deals: ContractDeal[], season: ContractSeason) {
  const year = seasonStartYear(season);
  const remainingDeals: ContractDeal[] = [];
  const activeDeal = selectActiveContractDeal(deals, season);

  if (activeDeal) {
    remainingDeals.push(activeDeal);
  }

  const futureDeals = deals
    .filter((deal) => deal.startYear > year)
    .sort((left, right) => left.startYear - right.startYear || left.endYear - right.endYear);

  remainingDeals.push(...futureDeals);

  return remainingDeals.sort((left, right) => left.startYear - right.startYear || left.endYear - right.endYear);
}

export function summarizeRemainingContract(salaries: Partial<Record<ContractSeason, number>>, deal: ContractDeal | null, season: ContractSeason) {
  if (!deal) return summarizeContractSalaries(salaries, season);
  const currentYear = Math.max(seasonStartYear(season), deal.startYear);
  const yearsRemaining = Math.max(0, deal.endYear - currentYear + 1);
  if (yearsRemaining === 0) return null;

  const throughSeason = seasonFromStartYear(deal.endYear);
  const salarySummary = summarizeContractSalaries(salaries, season, throughSeason);
  const expectedRemaining = deal.averageAnnualValue ? deal.averageAnnualValue * yearsRemaining : deal.total && deal.years ? (deal.total / deal.years) * yearsRemaining : null;
  if (salarySummary && salarySummary.years === yearsRemaining && (!expectedRemaining || salarySummary.total >= expectedRemaining * 0.6)) {
    return salarySummary;
  }
  if (!expectedRemaining) return salarySummary;
  return {
    years: yearsRemaining,
    total: Math.round(expectedRemaining),
    averageAnnualValue: Math.round(expectedRemaining / yearsRemaining),
  };
}

function summarizeContractWindow(salaries: Partial<Record<ContractSeason, number>>, deal: ContractDeal, startYear: number, endYear: number) {
  const years = Math.max(0, endYear - startYear + 1);
  if (years === 0) return null;

  const fromSeason = seasonFromStartYear(startYear);
  const throughSeason = seasonFromStartYear(endYear);
  const salarySummary = fromSeason ? summarizeContractSalaries(salaries, fromSeason, throughSeason) : null;
  const expectedTotal = deal.averageAnnualValue ? deal.averageAnnualValue * years : deal.total && deal.years ? (deal.total / deal.years) * years : null;
  if (salarySummary && salarySummary.years === years && (!expectedTotal || salarySummary.total >= expectedTotal * 0.6)) {
    return salarySummary;
  }
  if (!expectedTotal) return salarySummary;
  return {
    years,
    total: Math.round(expectedTotal),
    averageAnnualValue: Math.round(expectedTotal / years),
  };
}

export function summarizeTotalRemainingContract(salaries: Partial<Record<ContractSeason, number>>, deals: ContractDeal[], season: ContractSeason) {
  const remainingDeals = selectRemainingContractDeals(deals, season);
  if (remainingDeals.length === 0) return summarizeContractSalaries(salaries, season);

  const dealSummaries = remainingDeals
    .map((deal, index) => {
      const nextDeal = remainingDeals[index + 1];
      const startYear = Math.max(seasonStartYear(season), deal.startYear);
      const endYear = nextDeal && nextDeal.startYear <= deal.endYear ? nextDeal.startYear - 1 : deal.endYear;
      return summarizeContractWindow(salaries, deal, startYear, endYear);
    })
    .filter((summary): summary is ContractSummary => summary !== null);

  if (dealSummaries.length === 0) return summarizeContractSalaries(salaries, season);
  const total = dealSummaries.reduce((sum, summary) => sum + summary.total, 0);
  const years = dealSummaries.reduce((sum, summary) => sum + summary.years, 0);
  return {
    years,
    total,
    averageAnnualValue: total / years,
  };
}

function hasContractSeasonContext(row: PlayerContractRow, season: ContractSeason) {
  return selectedSeasonSalary(row, season) !== null ||
    summarizeTotalRemainingContract(row.salaryBySeason, row.contractDeals, season) !== null ||
    freeAgencyStatusForSeason(row.contractDeals, season) !== null;
}

function sortValue(row: PlayerContractRow, sort: string, season: ContractSeason): number | string | null {
  const originalSummary = contractDealSummary(selectActiveContractDeal(row.contractDeals, season)) ?? summarizeContractSalaries(row.salaryBySeason);
  const remainingSummary = summarizeTotalRemainingContract(row.salaryBySeason, row.contractDeals, season);
  const freeAgencyStatus = remainingSummary ? null : freeAgencyStatusForSeason(row.contractDeals, season);
  if (sort === "player") return row.playerName;
  if (sort === "team") return row.teamAbbreviation;
  if (sort === "position") return row.position ?? "";
  if (sort === "original_contract") return contractSummarySortValue(originalSummary);
  if (sort === "current_contract") return contractSummarySortValue(remainingSummary);
  if (sort === "original_years") return originalSummary?.years ?? null;
  if (sort === "remaining_years") return remainingSummary?.years ?? (freeAgencyStatus ? 0 : null);
  if (sort === "original_total") return originalSummary?.total ?? null;
  if (sort === "remaining_total") return remainingSummary?.total ?? (freeAgencyStatus ? 0 : null);
  if (sort === "original_aav") return originalSummary?.averageAnnualValue ?? null;
  if (sort === "current_aav") return remainingSummary?.averageAnnualValue ?? (freeAgencyStatus ? 0 : null);
  if (sort === "guaranteed") return row.guaranteedAmount;
  if (sort.startsWith("salary_")) {
    const key = sort.replace("salary_", "").replace("_", "-") as ContractSeason;
    return contractSalarySortValue(row, key);
  }
  return contractSalarySortValue(row, season) ?? row.guaranteedAmount;
}

function compareValues(left: number | string | null, right: number | string | null, order: "asc" | "desc") {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const compared = typeof left === "string" || typeof right === "string"
    ? String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" })
    : left - right;
  return order === "asc" ? compared : -compared;
}

function filterAndPageContracts(rows: PlayerContractRow[], params: PlayerContractParams, source: "postgres" | "json"): PlayerContractResult {
  const page = params.all ? 1 : Math.max(1, params.page ?? 1);
  const requestedPageSize = params.all ? 1000 : params.pageSize ?? 100;
  const pageSize = Math.min(1000, Math.max(1, requestedPageSize));
  const selectedSeason = contractSeason(params.season);
  const query = params.q?.trim().toLowerCase();
  const sort = params.sort ?? "selected_salary";
  const order = params.order ?? (sort === "player" || sort === "team" || sort === "position" ? "asc" : "desc");

  const filtered = rows
    .filter((row) => hasContractSeasonContext(row, selectedSeason))
    .filter((row) => !query || `${row.playerName} ${row.teamAbbreviation} ${row.position ?? ""}`.toLowerCase().includes(query))
    .filter((row) => !params.teamId || row.teamId === params.teamId || row.teamAbbreviation === params.teamId)
    .filter((row) => positionMatches(row.position, params.position))
    .sort((left, right) =>
      compareValues(sortValue(left, sort, selectedSeason), sortValue(right, sort, selectedSeason), order) ||
      left.playerName.localeCompare(right.playerName, undefined, { sensitivity: "base" }),
    );
  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    rows: filtered.slice(offset, offset + pageSize),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      source,
    },
  };
}

async function jsonFallback(params: PlayerContractParams): Promise<PlayerContractResult> {
  const [source, runtime, dealLookup] = await Promise.all([
    readFile(path.join(process.cwd(), "data", "raw", "player_contracts_2025_2031.json"), "utf8"),
    loadRuntimeFallbacks(),
    loadContractDealLookup(),
  ]);
  const payload = JSON.parse(source) as ContractJsonPayload;
  const rows = attachContractDeals(payload.contracts.map((row) => jsonRowToContract(row, playerLookup(runtime.players))), dealLookup);
  return filterAndPageContracts(rows, params, "json");
}

export async function listPlayerContracts(params: PlayerContractParams = {}): Promise<PlayerContractResult> {
  try {
    const result = await queryDatabase<PlayerContractDbRow>(`
      SELECT
        contract.source_rank,
        contract.player_slug,
        COALESCE(player.player_name, contract.source_player_name) AS player_name,
        contract.source_player_name,
        contract.team_id,
        contract.team_abbreviation,
        player.position,
        contract.salary_by_season,
        contract.options_by_season,
        contract.guarantee_status_by_season,
        contract.guaranteed_amount,
        contract.needs_followup
      FROM current_player_contracts contract
      LEFT JOIN players player
        ON player.player_slug = contract.player_slug
    `);
    if (!result) return jsonFallback(params);
    const dealLookup = await loadContractDealLookup();
    return filterAndPageContracts(attachContractDeals(result.rows.map(dbRowToContract), dealLookup), params, "postgres");
  } catch {
    return jsonFallback(params);
  }
}
