import type { SeasonType, Shot } from "@/lib/types";
import { memoizeServer } from "@/lib/serverCache";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/shotAttempts.server.ts can only be imported on the server.");
}

const shotAttemptCacheTtlMs = 5 * 60 * 1000;

type ShotAttemptDbRow = {
  shot_id: string;
  possession_id: string;
  game_id: string;
  season: string;
  player_id: string;
  team_id: string;
  quarter: number | string;
  clock: string;
  loc_x: number | string;
  loc_y: number | string;
  shot_distance: number | string;
  shot_zone: Shot["shotZone"];
  shot_type: Shot["shotType"];
  points_value: 2 | 3 | string;
  made: boolean;
  assisted: boolean;
  dribbles_before_shot: number | string;
  touch_time: number | string;
  defender_distance: number | string;
  closest_defender: string;
  contest_level: Shot["contestLevel"];
  shot_clock: number | string;
  expected_fg_pct: number | string;
  expected_points: number | string;
  actual_minus_expected: number | string;
  play_type: string;
  is_clutch: boolean;
  is_transition: boolean;
  is_catch_and_shoot: boolean;
  is_pull_up: boolean;
  is_at_rim: boolean;
  is_corner_three: boolean;
  is_above_break_three: boolean;
};

export type ShotAttemptScope = {
  teamId?: string;
  playerId?: string;
  gameId?: string;
  season?: string;
  seasonType?: SeasonType;
};

export type ShotAttemptResult = {
  rows: Shot[];
  source: "postgres" | "unavailable";
};

function numeric(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value: number | string) {
  return Math.round(numeric(value));
}

function mapShot(row: ShotAttemptDbRow): Shot {
  return {
    id: row.shot_id,
    possessionId: row.possession_id,
    gameId: row.game_id,
    season: row.season,
    playerId: row.player_id,
    teamId: row.team_id,
    quarter: integer(row.quarter),
    clock: row.clock,
    x: numeric(row.loc_x),
    y: numeric(row.loc_y),
    shotDistance: numeric(row.shot_distance),
    shotZone: row.shot_zone,
    shotType: row.shot_type,
    pointsValue: integer(row.points_value) === 3 ? 3 : 2,
    made: row.made,
    assisted: row.assisted,
    dribblesBeforeShot: integer(row.dribbles_before_shot),
    touchTime: numeric(row.touch_time),
    defenderDistance: numeric(row.defender_distance),
    closestDefender: row.closest_defender,
    contestLevel: row.contest_level,
    shotClock: numeric(row.shot_clock),
    expectedFgPct: numeric(row.expected_fg_pct),
    expectedPoints: numeric(row.expected_points),
    actualMinusExpected: numeric(row.actual_minus_expected),
    playType: row.play_type,
    isClutch: row.is_clutch,
    isTransition: row.is_transition,
    isCatchAndShoot: row.is_catch_and_shoot,
    isPullUp: row.is_pull_up,
    isAtRim: row.is_at_rim,
    isCornerThree: row.is_corner_three,
    isAboveBreakThree: row.is_above_break_three,
  };
}

async function listShotAttemptsUncached(scope: ShotAttemptScope): Promise<ShotAttemptResult> {
  const filters: string[] = [];
  const values: string[] = [];
  if (scope.teamId) {
    values.push(scope.teamId);
    filters.push(`shot.team_id = $${values.length}`);
  }
  if (scope.playerId) {
    values.push(scope.playerId);
    filters.push(`(shot.player_id = $${values.length} OR shot.player_slug = $${values.length})`);
  }
  if (scope.gameId) {
    values.push(scope.gameId);
    filters.push(`shot.game_id = $${values.length}`);
  }
  if (scope.season) {
    values.push(scope.season);
    filters.push(`shot.season = $${values.length}`);
  }
  if (scope.seasonType) {
    values.push(scope.seasonType);
    filters.push(`game.season_type = $${values.length}`);
  }
  if (!filters.length) return { rows: [], source: "unavailable" };

  try {
    const result = await queryDatabase<ShotAttemptDbRow>(`
      SELECT
        shot.shot_id,
        shot.possession_id,
        shot.game_id,
        shot.season,
        shot.player_id,
        shot.team_id,
        shot.quarter,
        shot.clock,
        shot.loc_x,
        shot.loc_y,
        shot.shot_distance,
        shot.shot_zone,
        shot.shot_type,
        shot.points_value,
        shot.made,
        shot.assisted,
        shot.dribbles_before_shot,
        shot.touch_time,
        shot.defender_distance,
        shot.closest_defender,
        shot.contest_level,
        shot.shot_clock,
        shot.expected_fg_pct,
        shot.expected_points,
        shot.actual_minus_expected,
        shot.play_type,
        shot.is_clutch,
        shot.is_transition,
        shot.is_catch_and_shoot,
        shot.is_pull_up,
        shot.is_at_rim,
        shot.is_corner_three,
        shot.is_above_break_three
      FROM current_shot_attempts shot
      JOIN current_games game
        ON game.ingestion_run_id = shot.ingestion_run_id
        AND game.game_id = shot.game_id
      WHERE ${filters.join(" AND ")}
      ORDER BY shot.game_id DESC, quarter, clock DESC, shot_id
    `, values);
    if (!result) return { rows: [], source: "unavailable" };
    return { rows: result.rows.map(mapShot), source: "postgres" };
  } catch {
    return { rows: [], source: "unavailable" };
  }
}

const listShotAttemptsCached = memoizeServer(listShotAttemptsUncached, {
  ttlMs: shotAttemptCacheTtlMs,
  maxEntries: 160,
});

export async function listShotAttempts(scope: ShotAttemptScope): Promise<ShotAttemptResult> {
  return listShotAttemptsCached(scope);
}
