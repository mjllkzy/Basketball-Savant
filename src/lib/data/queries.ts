import type {
  Game,
  Lineup,
  MetricValue,
  Player,
  PlayerGameStat,
  PlayerSeasonAggregate,
  Possession,
  Shot,
  Team,
  TeamSeasonAggregate
} from "@/lib/types";
import {
  officialBasketballReferencePlayerAdvancedCrosscheck,
  officialBasketballReferenceTeamAdvancedCrosscheck,
  officialGames,
  officialInsights,
  officialLineups,
  officialPasses,
  officialPlayerGameStats,
  officialPossessions,
  officialRebounds,
  officialShots,
  officialTeamGameStats,
  officialTeamSeasonAggregates,
  officialTeams
} from "@/lib/data/official";
import { masterDatasetVersion, masterMetadata, masterPlayerAliasBySlug, masterPlayers, masterPlayerSeasonAggregates } from "@/lib/data/master";
import { calculatePlayerMetric, calculateTeamMetric, getMetric, metricRegistry } from "@/lib/metrics/registry";
import { percentileRank } from "@/lib/metrics/formulas";
import { similarPlayers } from "@/lib/comparison";

export const datasetVersion = masterDatasetVersion;
export const dataSourceMetadata = masterMetadata;
export const basketballReferencePlayerAdvancedCrosscheck = officialBasketballReferencePlayerAdvancedCrosscheck;
export const basketballReferenceTeamAdvancedCrosscheck = officialBasketballReferenceTeamAdvancedCrosscheck;
export const defensiveEvents: never[] = [];
export const games = officialGames;
export const insights = officialInsights;
export const lineups = officialLineups;
export const passes = officialPasses;
export const playerGameStats = officialPlayerGameStats;
export const players = masterPlayers;
export const possessions = officialPossessions;
export const rebounds = officialRebounds;
export const shots = officialShots;
export const teamGameStats = officialTeamGameStats;
export const teams = officialTeams;

export type PageParams = {
  page?: number;
  pageSize?: number;
  all?: boolean;
};

export type SortParams = {
  sort?: string;
  order?: "asc" | "desc";
};

export type PlayerFilters = PageParams &
  SortParams & {
    q?: string;
    teamId?: string;
    position?: string;
    season?: string;
    minGames?: number;
    minMinutes?: number;
  };

export type ShotFilters = PageParams &
  SortParams & {
    q?: string;
    playerId?: string;
    teamId?: string;
    opponent?: string;
    season?: string;
    quarter?: number;
    clutch?: boolean;
    garbageTime?: boolean;
    shotZone?: string;
    shotType?: string;
    playType?: string;
    result?: "made" | "missed";
    defender?: string;
    assister?: string;
    transition?: boolean;
    assisted?: boolean;
    pullUp?: boolean;
    catchAndShoot?: boolean;
    minExpectedPoints?: number;
    minActualMinusExpected?: number;
    maxActualMinusExpected?: number;
  };

export function datasetSummary() {
  return {
    version: datasetVersion,
    provider: dataSourceMetadata.dataProvider,
    generatedAt: dataSourceMetadata.generatedAt,
    coverage: dataSourceMetadata.coverage,
    teams: teams.length,
    players: players.length,
    games: games.length,
    possessions: possessions.length,
    shots: shots.length,
    lineups: lineups.length
  };
}

export function paginate<T>(rows: T[], params: PageParams = {}) {
  const total = rows.length;
  const page = params.all ? 1 : Math.max(1, params.page ?? 1);
  const pageSize = params.all ? Math.max(1, total) : Math.min(100, Math.max(1, params.pageSize ?? 20));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages }
  };
}

export function getTeamByIdOrSlug(idOrSlug: string): Team | undefined {
  return teams.find((team) => team.id === idOrSlug || team.slug === idOrSlug || team.abbreviation.toLowerCase() === idOrSlug.toLowerCase());
}

export function getPlayerByIdOrSlug(idOrSlug: string): Player | undefined {
  const aliasPlayerId = masterPlayerAliasBySlug.get(idOrSlug);
  return players.find((player) => player.id === idOrSlug || player.id === aliasPlayerId || player.slug === idOrSlug);
}

export function getGame(id: string): Game | undefined {
  return games.find((game) => game.id === id);
}

export function teamName(teamId: string): string {
  const team = teams.find((item) => item.id === teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

export function gameMatchupLabel(game: Game): string {
  return `${teamName(game.awayTeamId)} ${game.neutralSite ? "vs." : "at"} ${teamName(game.homeTeamId)}`;
}

export function gameVenueLabel(game: Game): string {
  return game.neutralSite ? "Neutral site" : game.arena ?? "";
}

export function gameContextLabel(game: Game): string {
  if (game.seasonType === "Regular Season") return "Regular Season";

  const match = game.id.match(/^004\d{2}00([1-4])([0-7])([1-7])$/);
  if (!match) return game.seasonType;

  const round = Number(match[1]);
  const gameNumber = Number(match[3]);
  if (round === 4) return `NBA Finals Game ${gameNumber}`;

  const homeTeam = teams.find((team) => team.id === game.homeTeamId);
  const awayTeam = teams.find((team) => team.id === game.awayTeamId);
  const conference = homeTeam && awayTeam && homeTeam.conference === awayTeam.conference ? homeTeam.conference : undefined;

  if (round === 3) {
    const conferenceFinals = conference === "East" ? "ECF" : conference === "West" ? "WCF" : "Conference Finals";
    return `${conferenceFinals} Game ${gameNumber}`;
  }
  if (round === 2) return `${conference ? `${conference} Semifinals` : "Conference Semifinals"} Game ${gameNumber}`;
  if (round === 1) return `${conference ? `${conference} First Round` : "First Round"} Game ${gameNumber}`;
  return `Playoffs Game ${gameNumber}`;
}

export function playerName(playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? playerId;
}

export function getGameLeadingScorer(gameId: string): { line: PlayerGameStat; player: Player; team: Team; points: number } | null {
  const leader = playerGameStats
    .filter((line) => line.gameId === gameId)
    .map((line) => {
      const player = players.find((item) => item.id === line.playerId);
      const team = teams.find((item) => item.id === line.teamId);
      return player && team ? { line, player, team } : null;
    })
    .filter((row): row is { line: PlayerGameStat; player: Player; team: Team } => row !== null)
    .sort((a, b) => b.line.pts - a.line.pts || b.line.minutes - a.line.minutes || a.player.name.localeCompare(b.player.name))[0];

  return leader ? { ...leader, points: leader.line.pts } : null;
}

function compareNullable(a: number | null, b: number | null, direction: "asc" | "desc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function textMatch(value: string, query?: string) {
  if (!query || query.trim().length === 0) return true;
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function positionMatches(playerPosition: string, requestedPosition?: string) {
  if (!requestedPosition) return true;
  if (requestedPosition === "G") return playerPosition === "PG" || playerPosition === "SG";
  if (requestedPosition === "F") return playerPosition === "SF" || playerPosition === "PF";
  return playerPosition === requestedPosition;
}

export const playerSeasonAggregates: PlayerSeasonAggregate[] = masterPlayerSeasonAggregates;
export const teamSeasonAggregates: TeamSeasonAggregate[] = officialTeamSeasonAggregates;

export function listTeams(params: PageParams & SortParams & { q?: string; conference?: string; division?: string } = {}) {
  let rows = [...teams];
  rows = rows.filter((team) => textMatch(`${team.city} ${team.name} ${team.abbreviation}`, params.q));
  if (params.conference) rows = rows.filter((team) => team.conference === params.conference);
  if (params.division) rows = rows.filter((team) => team.division === params.division);
  rows.sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`) || a.id.localeCompare(b.id));
  return paginate(rows, params);
}

export function listPlayers(params: PlayerFilters = {}) {
  let rows = [...playerSeasonAggregates];
  rows = rows.filter((row) => textMatch(`${row.player.name} ${row.team.city} ${row.team.name} ${row.player.position}`, params.q));
  if (params.teamId) rows = rows.filter((row) => row.team.id === params.teamId || row.team.slug === params.teamId);
  if (params.position) rows = rows.filter((row) => positionMatches(row.player.position, params.position));
  if (params.minGames) rows = rows.filter((row) => row.games >= params.minGames!);
  if (params.minMinutes) rows = rows.filter((row) => row.minutes >= params.minMinutes!);
  const sortKey = params.sort ?? "name";
  const order = params.order ?? (sortKey === "name" ? "asc" : "desc");
  rows.sort((a, b) => {
    if (sortKey === "name") return order === "asc" ? a.player.name.localeCompare(b.player.name) : b.player.name.localeCompare(a.player.name);
    if (sortKey === "team") return order === "asc" ? a.team.abbreviation.localeCompare(b.team.abbreviation) : b.team.abbreviation.localeCompare(a.team.abbreviation);
    const compared = compareNullable(calculatePlayerMetric(sortKey, a), calculatePlayerMetric(sortKey, b), order);
    return compared || a.player.name.localeCompare(b.player.name);
  });
  return paginate(rows, params);
}

export function getPlayerProfile(idOrSlug: string) {
  const player = getPlayerByIdOrSlug(idOrSlug);
  if (!player) return undefined;
  const aggregate = playerSeasonAggregates.find((row) => row.player.id === player.id)!;
  const gameLog = playerGameStats
    .filter((line) => line.playerId === player.id)
    .map((line) => ({ ...line, game: games.find((game) => game.id === line.gameId)!, opponent: teams.find((team) => team.id === line.opponentTeamId)! }))
    .sort((a, b) => b.game.date.localeCompare(a.game.date));
  const playerShots = shots.filter((shot) => shot.playerId === player.id);
  const metricValues = getMetricValuesForPlayer(player.id);
  return { player, team: aggregate.team, aggregate, gameLog, shots: playerShots, metricValues, similar: getSimilarPlayers(player.id, "Overall").slice(0, 5) };
}

export function getTeamProfile(idOrSlug: string) {
  const team = getTeamByIdOrSlug(idOrSlug);
  if (!team) return undefined;
  const aggregate = teamSeasonAggregates.find((row) => row.team.id === team.id)!;
  const rosterRows = playerSeasonAggregates.filter((row) => row.team.id === team.id);
  const teamGames = games
    .filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const teamLineups = lineups.filter((lineup) => lineup.teamId === team.id).sort((a, b) => b.netRating - a.netRating);
  return { team, aggregate, rosterRows, games: teamGames, shots: shots.filter((shot) => shot.teamId === team.id), lineups: teamLineups };
}

export function listGames(params: PageParams & { teamId?: string; status?: string; season?: string; date?: string } = {}) {
  let rows = [...games];
  if (params.teamId) rows = rows.filter((game) => game.homeTeamId === params.teamId || game.awayTeamId === params.teamId);
  if (params.status) rows = rows.filter((game) => game.status === params.status);
  if (params.season) rows = rows.filter((game) => game.season === params.season);
  if (params.date) rows = rows.filter((game) => game.date === params.date);
  rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return paginate(rows, params);
}

export function getGameReport(gameId: string) {
  const game = getGame(gameId);
  if (!game) return undefined;
  const homeTeam = teams.find((team) => team.id === game.homeTeamId)!;
  const awayTeam = teams.find((team) => team.id === game.awayTeamId)!;
  const boxScore = playerGameStats
    .filter((line) => line.gameId === game.id)
    .map((line) => ({ ...line, player: players.find((player) => player.id === line.playerId)!, team: teams.find((team) => team.id === line.teamId)! }))
    .sort((a, b) => b.pts - a.pts);
  const teamStats = teamGameStats.filter((line) => line.gameId === game.id);
  const feed = possessions
    .filter((possession) => possession.gameId === game.id)
    .slice(0, 160)
    .map((possession) => ({
      ...possession,
      offense: teams.find((team) => team.id === possession.offenseTeamId)!,
      defense: teams.find((team) => team.id === possession.defenseTeamId)!,
      primaryPlayer: players.find((player) => player.id === possession.primaryPlayerId)!,
      defender: possession.defenderPlayerId ? players.find((player) => player.id === possession.defenderPlayerId) : undefined,
      lineup: lineups.find((lineup) => lineup.id === possession.lineupOffenseId)
    }));
  const gameShots = shots.filter((shot) => shot.gameId === game.id);
  return { game, homeTeam, awayTeam, boxScore, teamStats, feed, shots: gameShots, lineups: lineups.filter((lineup) => lineup.gameId === game.id) };
}

export function getPlayerLeaderboard(metricKey = "pts", params: PlayerFilters & { limit?: number } = {}) {
  getMetric(metricKey);
  const rows = listPlayers({ ...params, sort: metricKey, order: params.order ?? "desc", page: 1, pageSize: params.limit ?? params.pageSize ?? 50 }).rows;
  const values = playerSeasonAggregates.map((row) => calculatePlayerMetric(metricKey, row)).filter((value): value is number => value !== null);
  return rows.map((row, index) => {
    const value = calculatePlayerMetric(metricKey, row);
    return {
      rank: index + 1,
      player: row.player,
      team: row.team,
      metricKey,
      value,
      percentile: value === null ? 0 : percentileRank(value, values, getMetric(metricKey).higherIsBetter),
      aggregate: row
    };
  });
}

export function getCustomLeaderboard(entityType: "players" | "teams" | "lineups", metricKeys: string[], params: PlayerFilters = {}) {
  if (entityType === "teams") {
    return teamSeasonAggregates.map((row) => ({
      id: row.team.id,
      label: `${row.team.city} ${row.team.name}`,
      team: row.team,
      values: Object.fromEntries(metricKeys.map((key) => [key, calculateTeamMetric(key, row)]))
    }));
  }
  if (entityType === "lineups") {
    return lineups
      .slice()
      .sort((a, b) => b.netRating - a.netRating)
      .map((lineup) => ({
        id: lineup.id,
        label: [lineup.player1Id, lineup.player2Id, lineup.player3Id, lineup.player4Id, lineup.player5Id].map(playerName).join(" / "),
        team: teams.find((team) => team.id === lineup.teamId)!,
        values: {
          lineup_off_rating: lineup.offensiveRating,
          lineup_def_rating: lineup.defensiveRating,
          lineup_net_rating: lineup.netRating,
          lineup_pace: lineup.possessions
        }
      }));
  }
  return listPlayers({ ...params, page: 1, pageSize: 100 }).rows.map((row) => ({
    id: row.player.id,
    label: row.player.name,
    player: row.player,
    team: row.team,
    values: Object.fromEntries(metricKeys.map((key) => [key, calculatePlayerMetric(key, row)]))
  }));
}

export function filterShotRows(sourceRows: Shot[], params: ShotFilters = {}) {
  let rows = [...sourceRows];
  if (params.playerId) {
    const playerId = params.playerId;
    const resolvedPlayerId = getPlayerByIdOrSlug(playerId)?.id;
    rows = rows.filter((shot) => shot.playerId === playerId || resolvedPlayerId === shot.playerId);
  }
  if (params.teamId) {
    const teamId = params.teamId;
    const resolvedTeamId = getTeamByIdOrSlug(teamId)?.id;
    rows = rows.filter((shot) => shot.teamId === teamId || resolvedTeamId === shot.teamId);
  }
  if (params.season) rows = rows.filter((shot) => shot.season === params.season);
  if (params.quarter) rows = rows.filter((shot) => shot.quarter === params.quarter);
  if (params.clutch !== undefined) rows = rows.filter((shot) => shot.isClutch === params.clutch);
  if (params.shotZone) rows = rows.filter((shot) => shot.shotZone === params.shotZone);
  if (params.shotType) rows = rows.filter((shot) => shot.shotType === params.shotType);
  if (params.playType) rows = rows.filter((shot) => shot.playType === params.playType);
  if (params.result) rows = rows.filter((shot) => shot.made === (params.result === "made"));
  if (params.defender) rows = rows.filter((shot) => shot.defenderId === params.defender || playerName(shot.defenderId ?? "").toLowerCase().includes(params.defender!.toLowerCase()));
  if (params.assister) rows = rows.filter((shot) => shot.assisterId === params.assister || playerName(shot.assisterId ?? "").toLowerCase().includes(params.assister!.toLowerCase()));
  if (params.transition !== undefined) rows = rows.filter((shot) => shot.isTransition === params.transition);
  if (params.assisted !== undefined) rows = rows.filter((shot) => shot.assisted === params.assisted);
  if (params.pullUp !== undefined) rows = rows.filter((shot) => shot.isPullUp === params.pullUp);
  if (params.catchAndShoot !== undefined) rows = rows.filter((shot) => shot.isCatchAndShoot === params.catchAndShoot);
  if (params.minExpectedPoints !== undefined) rows = rows.filter((shot) => shot.expectedPoints >= params.minExpectedPoints!);
  if (params.minActualMinusExpected !== undefined) rows = rows.filter((shot) => shot.actualMinusExpected >= params.minActualMinusExpected!);
  if (params.maxActualMinusExpected !== undefined) rows = rows.filter((shot) => shot.actualMinusExpected <= params.maxActualMinusExpected!);
  if (params.q) {
    rows = rows.filter((shot) => {
      const player = players.find((item) => item.id === shot.playerId);
      const team = teams.find((item) => item.id === shot.teamId);
      return textMatch(`${player?.name ?? shot.playerId} ${team?.city ?? ""} ${team?.name ?? shot.teamId} ${shot.playType} ${shot.shotZone}`, params.q);
    });
  }
  const sort = params.sort ?? "expectedPoints";
  const order = params.order ?? "desc";
  rows.sort((a, b) => {
    const av = Number(a[sort as keyof Shot]);
    const bv = Number(b[sort as keyof Shot]);
    if (Number.isFinite(av) && Number.isFinite(bv)) return order === "asc" ? av - bv : bv - av;
    return a.id.localeCompare(b.id);
  });
  return paginate(rows, params);
}

export function filterShots(params: ShotFilters = {}) {
  return filterShotRows(shots, params);
}

export function filterPossessions(params: ShotFilters = {}) {
  const shotResult = filterShots({ ...params, page: 1, pageSize: 5000 }).rows;
  const possessionIds = new Set(shotResult.map((shot) => shot.possessionId));
  let rows: Possession[] = possessions.filter((possession) => possessionIds.has(possession.id));
  rows = rows.sort((a, b) => b.actualMinusExpected - a.actualMinusExpected || a.id.localeCompare(b.id));
  return paginate(rows, params);
}

export function getMetricValuesForPlayer(playerId: string): MetricValue[] {
  const aggregate = playerSeasonAggregates.find((row) => row.player.id === playerId);
  if (!aggregate) return [];
  return metricRegistry.flatMap((metric): MetricValue[] => {
      const value = calculatePlayerMetric(metric.key, aggregate);
      if (value === null || !Number.isFinite(value)) return [];
      const allValues = playerSeasonAggregates.map((row) => calculatePlayerMetric(metric.key, row)).filter((item): item is number => item !== null && Number.isFinite(item));
      const sorted = [...allValues].sort((a, b) => (metric.higherIsBetter ? b - a : a - b));
      return [{
        id: `mv-${playerId}-${metric.key}`,
        metricKey: metric.key,
        entityType: "player" as const,
        entityId: playerId,
        season: aggregate.season,
        seasonType: "Regular Season" as const,
        value,
        percentile: percentileRank(value, allValues, metric.higherIsBetter),
        rank: sorted.findIndex((item) => item === value) + 1,
        sampleSize: aggregate.games
      }];
    });
}

export function searchAll(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const playerRows = players
    .filter((player) => `${player.name} ${player.position}`.toLowerCase().includes(q))
    .slice(0, limit)
    .map((player) => ({ type: "player" as const, id: player.id, label: player.name, href: `/players/${player.slug}`, meta: teams.find((team) => team.id === player.teamId)?.abbreviation ?? "" }));
  const teamRows = teams
    .filter((team) => `${team.city} ${team.name} ${team.abbreviation}`.toLowerCase().includes(q))
    .slice(0, limit)
    .map((team) => ({ type: "team" as const, id: team.id, label: `${team.city} ${team.name}`, href: `/teams/${team.slug}`, meta: team.conference }));
  const gameRows = games
    .filter((game) => `${game.id} ${teamName(game.homeTeamId)} ${teamName(game.awayTeamId)}`.toLowerCase().includes(q))
    .slice(0, limit)
    .map((game) => ({ type: "game" as const, id: game.id, label: gameMatchupLabel(game), href: `/games/${game.id}`, meta: game.date }));
  return [...playerRows, ...teamRows, ...gameRows].slice(0, limit);
}

export type SimilarityBasis = "Overall" | "Scoring style" | "Shot profile" | "Playmaking" | "Defense" | "Physical/role";

export function getSimilarPlayers(playerId: string, basis: SimilarityBasis = "Overall") {
  const target = playerSeasonAggregates.find((row) => row.player.id === playerId);
  if (!target) return [];
  return similarPlayers(target, playerSeasonAggregates, 10).map((row) => ({
    player: row.aggregate.player,
    team: row.aggregate.team,
    score: row.score,
    basis,
    matchingTraits: row.traits,
    aggregate: row.aggregate,
    ratioScore: row.ratioScore,
    perMinuteScore: row.perMinuteScore,
    physicalScore: row.physicalScore,
    roleScore: row.roleScore,
    buildScore: row.buildScore,
    summary: row.candidateSummary
  }));
}

export function gameFlow(gameId: string) {
  const report = getGameReport(gameId);
  if (!report) return [];
  let home = 0;
  let away = 0;
  return report.feed.slice(0, 80).map((possession, index) => {
    if (possession.offenseTeamId === report.game.homeTeamId) home += possession.points;
    else away += possession.points;
    return {
      index,
      label: `${possession.quarter} ${possession.clock}`,
      home,
      away,
      margin: home - away
    };
  });
}

export function topPerformers(metricKeys = ["pts", "ts_pct", "efg_pct", "usage_rate", "ast", "stl", "blk"]) {
  return metricKeys.map((metricKey) => {
    const leader = getPlayerLeaderboard(metricKey, { limit: 1 })[0];
    return { metric: getMetric(metricKey), leader };
  });
}

export function latestGames(limit = 4) {
  return [...games].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export function featuredInsights() {
  return insights;
}

export function playerMetricSnapshot(playerId: string, keys: string[]) {
  const aggregate = playerSeasonAggregates.find((row) => row.player.id === playerId);
  if (!aggregate) return [];
  return keys.map((key) => ({ metric: getMetric(key), value: calculatePlayerMetric(key, aggregate) }));
}

export function teamMetricSnapshot(teamId: string, keys: string[]) {
  const aggregate = teamSeasonAggregates.find((row) => row.team.id === teamId);
  if (!aggregate) return [];
  return keys.map((key) => ({ metric: getMetric(key), value: calculateTeamMetric(key, aggregate) }));
}

export function lineupPlayers(lineup: Lineup) {
  return [lineup.player1Id, lineup.player2Id, lineup.player3Id, lineup.player4Id, lineup.player5Id].map((id) => players.find((player) => player.id === id)!);
}
