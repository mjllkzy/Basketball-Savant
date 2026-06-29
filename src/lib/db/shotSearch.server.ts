import { filterShotCollection, filterShotRows, type ShotCollectionFilters } from "@/lib/data/shotFilters";
import { getCachedTeamShotChart } from "@/lib/data/teamShotCache";
import type { SeasonType, Shot } from "@/lib/types";
import { DEFAULT_SEASON_TYPE, parseSeasonType } from "@/lib/seasonTypes";
import { DEFAULT_SEASON, parseSeason } from "@/lib/seasons";
import { loadGameAnalyticsByIds, type GameListItem } from "./gameAnalytics.server";
import { listComparisonPlayerOptions, loadPlayerProfileAnalytics } from "./playerAnalytics.server";
import { listTeamSeasonSummaries } from "./teamAnalytics.server";
import { listShotAttempts } from "./shotAttempts.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/shotSearch.server.ts can only be imported on the server.");
}

export type ShotSearchFilters = ShotCollectionFilters & {
  playerId?: string;
  teamId?: string;
  opponent?: string;
  defender?: string;
  assister?: string;
  seasonType?: SeasonType;
};

type FilteredShotCollection = ReturnType<typeof filterShotCollection>;

export type ShotSearchResult = Omit<FilteredShotCollection, "meta"> & {
  meta: FilteredShotCollection["meta"] & {
    source: "postgres" | "json" | "unavailable";
  };
  source: "postgres" | "json" | "unavailable";
  scopeRequired: boolean;
  gameLookup: Map<string, GameListItem>;
  summary: {
    attempts: number;
    makes: number;
    expectedPoints: number;
    actualMinusExpected: number;
  };
};

export async function loadShotSearchOptions() {
  const [players, teams] = await Promise.all([
    listComparisonPlayerOptions(),
    listTeamSeasonSummaries(),
  ]);
  return {
    players,
    teams: teams.rows.map((row) => row.team),
    source: teams.source,
  };
}

async function scopedShots(filters: ShotSearchFilters): Promise<{ rows: Shot[]; source: "postgres" | "json" | "unavailable" }> {
  const season = parseSeason(filters.season);
  const seasonType = parseSeasonType(filters.seasonType ?? DEFAULT_SEASON_TYPE);
  if (filters.playerId) {
    const profile = await loadPlayerProfileAnalytics(filters.playerId, seasonType, season);
    return {
      rows: profile?.shots ?? [],
      source: profile?.source ?? "unavailable",
    };
  }
  if (filters.teamId) {
    const postgresShots = await listShotAttempts({ teamId: filters.teamId, season, seasonType });
    if (postgresShots.source === "postgres" && postgresShots.rows.length) {
      return {
        rows: postgresShots.rows,
        source: "postgres",
      };
    }
    if (season !== DEFAULT_SEASON || seasonType !== DEFAULT_SEASON_TYPE) {
      return {
        rows: [],
        source: postgresShots.source,
      };
    }
    return {
      rows: getCachedTeamShotChart(filters.teamId),
      source: "json",
    };
  }
  return { rows: [], source: "unavailable" };
}

export async function searchShotAnalytics(filters: ShotSearchFilters): Promise<ShotSearchResult> {
  const scoped = await scopedShots(filters);
  let sourceRows = scoped.rows;
  if (filters.teamId) sourceRows = sourceRows.filter((shot) => shot.teamId === filters.teamId);
  if (filters.defender) {
    const defender = filters.defender.toLowerCase();
    sourceRows = sourceRows.filter((shot) =>
      shot.defenderId === filters.defender
      || shot.closestDefender.toLowerCase().includes(defender));
  }
  if (filters.assister) sourceRows = sourceRows.filter((shot) => shot.assisterId === filters.assister);

  const allFilteredRows = filterShotRows(sourceRows, filters);
  const filtered = filterShotCollection(allFilteredRows, {
    page: filters.page,
    pageSize: filters.pageSize,
  });
  const gameLookup = await loadGameAnalyticsByIds(filtered.rows.map((shot) => shot.gameId));
  return {
    ...filtered,
    meta: { ...filtered.meta, source: scoped.source },
    source: scoped.source,
    scopeRequired: !filters.playerId && !filters.teamId,
    gameLookup,
    summary: {
      attempts: allFilteredRows.length,
      makes: allFilteredRows.filter((shot) => shot.made).length,
      expectedPoints: allFilteredRows.reduce((total, shot) => total + shot.expectedPoints, 0),
      actualMinusExpected: allFilteredRows.reduce((total, shot) => total + shot.actualMinusExpected, 0),
    },
  };
}
