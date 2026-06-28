import { percentileRank } from "@/lib/metrics/formulas";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";
import type { PlayerSeasonAggregate, SeasonType, Team } from "@/lib/types";
import { DEFAULT_SEASON_TYPE, parseSeasonType } from "@/lib/seasonTypes";
import { loadAllComparisonPlayers } from "./playerAnalytics.server";
import { listTeamSeasonSummaries } from "./teamAnalytics.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/apiAnalytics.server.ts can only be imported on the server.");
}

export type ApiPageParams = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  sort?: string;
  order?: "asc" | "desc";
};

export type ApiPlayerFilters = ApiPageParams & {
  q?: string;
  teamId?: string;
  position?: string;
  season?: string;
  seasonType?: SeasonType;
  minGames?: number;
  minMinutes?: number;
};

export type ApiTeamFilters = ApiPageParams & {
  q?: string;
  conference?: string;
  division?: string;
  seasonType?: SeasonType;
};

type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  source: "postgres" | "json";
};

function paginate<T>(rows: T[], params: ApiPageParams, source: "postgres" | "json") {
  const total = rows.length;
  const page = params.all ? 1 : Math.max(1, params.page ?? 1);
  const pageSize = params.all
    ? Math.max(1, total)
    : Math.min(100, Math.max(1, params.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      source,
    } satisfies ApiMeta,
  };
}

function textMatches(value: string, query?: string) {
  return !query?.trim() || value.toLowerCase().includes(query.trim().toLowerCase());
}

function positionMatches(position: string, requested?: string) {
  if (!requested) return true;
  if (requested === "G") return position === "PG" || position === "SG";
  if (requested === "F") return position === "SF" || position === "PF";
  return position === requested;
}

function compareNullable(left: number | null, right: number | null, order: "asc" | "desc") {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return order === "asc" ? left - right : right - left;
}

export async function listPlayerApiRecords(params: ApiPlayerFilters = {}) {
  const seasonType = parseSeasonType(params.seasonType ?? DEFAULT_SEASON_TYPE);
  const loaded = await loadAllComparisonPlayers(seasonType);
  const rows = loaded.rows
    .map((row) => row.aggregate)
    .filter((row) => textMatches(
      `${row.player.name} ${row.team.city} ${row.team.name} ${row.team.abbreviation} ${row.player.position}`,
      params.q,
    ))
    .filter((row) => !params.teamId
      || row.team.id === params.teamId
      || row.team.slug === params.teamId
      || row.team.abbreviation === params.teamId)
    .filter((row) => positionMatches(row.player.position, params.position))
    .filter((row) => !params.season || row.season === params.season)
    .filter((row) => params.minGames === undefined || row.games >= params.minGames)
    .filter((row) => params.minMinutes === undefined || row.minutes >= params.minMinutes);

  const sortKey = params.sort ?? "name";
  const order = params.order ?? (sortKey === "name" ? "asc" : "desc");
  rows.sort((left, right) => {
    if (sortKey === "name") {
      return order === "asc"
        ? left.player.name.localeCompare(right.player.name)
        : right.player.name.localeCompare(left.player.name);
    }
    if (sortKey === "team") {
      return order === "asc"
        ? left.team.abbreviation.localeCompare(right.team.abbreviation)
        : right.team.abbreviation.localeCompare(left.team.abbreviation);
    }
    if (sortKey === "position") {
      const orderByPosition = ["PG", "SG", "SF", "PF", "C"];
      const compared = orderByPosition.indexOf(left.player.position) - orderByPosition.indexOf(right.player.position);
      return order === "asc" ? compared : -compared;
    }
    const compared = compareNullable(
      calculatePlayerMetric(sortKey, left),
      calculatePlayerMetric(sortKey, right),
      order,
    );
    return compared || left.player.name.localeCompare(right.player.name);
  });

  return paginate(rows, params, loaded.source);
}

export async function listTeamApiRecords(params: ApiTeamFilters = {}) {
  const seasonType = parseSeasonType(params.seasonType ?? DEFAULT_SEASON_TYPE);
  const loaded = await listTeamSeasonSummaries({ seasonType });
  const rows = loaded.rows
    .map((row) => row.team)
    .filter((team) => textMatches(`${team.city} ${team.name} ${team.abbreviation}`, params.q))
    .filter((team) => !params.conference || team.conference === params.conference)
    .filter((team) => !params.division || team.division === params.division);

  const order = params.order ?? "asc";
  rows.sort((left, right) => {
    const compared = `${left.city} ${left.name}`.localeCompare(`${right.city} ${right.name}`);
    return order === "asc" ? compared : -compared;
  });
  return paginate(rows, params, loaded.source);
}

export async function listLeaderboardApiRecords(
  metricKey = "pts",
  params: ApiPlayerFilters & { limit?: number } = {},
) {
  const metric = getMetric(metricKey);
  const loaded = await listPlayerApiRecords({ ...params, all: true });
  const values = loaded.rows
    .map((row) => calculatePlayerMetric(metricKey, row))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const order = params.order ?? (metric.higherIsBetter ? "desc" : "asc");
  const sorted = loaded.rows
    .map((aggregate) => ({ aggregate, value: calculatePlayerMetric(metricKey, aggregate) }))
    .filter((row): row is { aggregate: PlayerSeasonAggregate; value: number } => row.value !== null)
    .sort((left, right) =>
      compareNullable(left.value, right.value, order)
      || left.aggregate.player.name.localeCompare(right.aggregate.player.name))
    .slice(0, Math.min(100, Math.max(1, params.limit ?? params.pageSize ?? 50)));

  return {
    rows: sorted.map((row, index) => ({
      rank: index + 1,
      player: row.aggregate.player,
      team: row.aggregate.team,
      metricKey,
      value: row.value,
      percentile: percentileRank(row.value, values, metric.higherIsBetter),
      aggregate: row.aggregate,
    })),
    source: loaded.meta.source,
  };
}

export type PlayerApiRecord = PlayerSeasonAggregate;
export type TeamApiRecord = Team;
