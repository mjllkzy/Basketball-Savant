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
};

export type ContractSummary = {
  years: number;
  total: number;
  averageAnnualValue: number;
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

export function summarizeContractSalaries(salaries: Partial<Record<ContractSeason, number>>, fromSeason?: ContractSeason): ContractSummary | null {
  const startIndex = fromSeason ? contractSeasons.indexOf(fromSeason) : 0;
  const seasons = contractSeasons
    .slice(Math.max(0, startIndex))
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

function sortValue(row: PlayerContractRow, sort: string, season: ContractSeason): number | string | null {
  if (sort === "player") return row.playerName;
  if (sort === "team") return row.teamAbbreviation;
  if (sort === "position") return row.position ?? "";
  if (sort === "original_contract") return contractSummarySortValue(summarizeContractSalaries(row.salaryBySeason));
  if (sort === "current_contract") return contractSummarySortValue(summarizeContractSalaries(row.salaryBySeason, season));
  if (sort === "guaranteed") return row.guaranteedAmount;
  if (sort.startsWith("salary_")) {
    const key = sort.replace("salary_", "").replace("_", "-") as ContractSeason;
    return row.salaryBySeason[key] ?? null;
  }
  return selectedSeasonSalary(row, season) ?? row.guaranteedAmount;
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
    .filter((row) => selectedSeasonSalary(row, selectedSeason) !== null)
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
  const [source, runtime] = await Promise.all([
    readFile(path.join(process.cwd(), "data", "raw", "player_contracts_2025_2031.json"), "utf8"),
    loadRuntimeFallbacks(),
  ]);
  const payload = JSON.parse(source) as ContractJsonPayload;
  const rows = payload.contracts.map((row) => jsonRowToContract(row, playerLookup(runtime.players)));
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
    return filterAndPageContracts(result.rows.map(dbRowToContract), params, "postgres");
  } catch {
    return jsonFallback(params);
  }
}
