import type { Shot, ShotZone } from "@/lib/types";
import { expectedShotValue } from "@/lib/models/expectedShotValue";

export type ShotChartTable = {
  headers: string[];
  rows: unknown[][];
};

function value(table: ShotChartTable, row: unknown[], key: string): unknown {
  const index = table.headers.indexOf(key);
  return index === -1 ? undefined : row[index];
}

function stringValue(table: ShotChartTable, row: unknown[], key: string): string {
  const raw = value(table, row, key);
  return raw === null || raw === undefined ? "" : String(raw);
}

function numberValue(table: ShotChartTable, row: unknown[], key: string): number {
  const raw = value(table, row, key);
  const numeric = typeof raw === "number" ? raw : Number(raw ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function shotZone(zoneBasic: string, zoneRange: string, shotType: string): ShotZone {
  if (zoneBasic === "Restricted Area") return "Rim";
  if (zoneBasic.includes("Corner 3")) return "Corner Three";
  if (zoneBasic.includes("Above the Break 3") || shotType.startsWith("3PT")) return "Above Break Three";
  if (zoneRange === "16-24 ft.") return "Long Midrange";
  return "Short Midrange";
}

function actionShotType(actionType: string): Shot["shotType"] {
  const action = actionType.toLowerCase();
  if (action.includes("dunk")) return "Dunk";
  if (action.includes("layup")) return "Layup";
  if (action.includes("floating") || action.includes("floater")) return "Floater";
  if (action.includes("pullup") || action.includes("pull-up")) return "Pull-Up";
  if (action.includes("step back") || action.includes("stepback")) return "Stepback";
  if (action.includes("hook")) return "Hook";
  return "Jump Shot";
}

function clock(minutes: number, seconds: number) {
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function mapNbaShotChartTable(table: ShotChartTable | undefined, season: string): Shot[] {
  if (!table?.headers.length || !table.rows.length) return [];

  return table.rows.map((row) => {
    const gameId = stringValue(table, row, "GAME_ID");
    const gameEventId = stringValue(table, row, "GAME_EVENT_ID");
    const playerId = String(numberValue(table, row, "PLAYER_ID"));
    const teamId = String(numberValue(table, row, "TEAM_ID"));
    const actionType = stringValue(table, row, "ACTION_TYPE");
    const nbaShotType = stringValue(table, row, "SHOT_TYPE");
    const zone = shotZone(stringValue(table, row, "SHOT_ZONE_BASIC"), stringValue(table, row, "SHOT_ZONE_RANGE"), nbaShotType);
    const shotType = actionShotType(actionType);
    const pointsValue = nbaShotType.startsWith("3PT") ? 3 : 2;
    const made = numberValue(table, row, "SHOT_MADE_FLAG") === 1;
    const isCatchAndShoot = actionType.toLowerCase().includes("catch");
    const isPullUp = shotType === "Pull-Up";
    const model = expectedShotValue({
      shotDistance: numberValue(table, row, "SHOT_DISTANCE"),
      shotZone: zone,
      pointsValue,
      defenderDistance: 4,
      touchTime: isCatchAndShoot ? 1.2 : isPullUp ? 4 : 2.5,
      dribblesBeforeShot: isCatchAndShoot ? 0 : isPullUp ? 4 : 1,
      shotClock: 12,
      playerSkill: 0,
      playType: actionType || shotType,
      transition: actionType.toLowerCase().includes("transition"),
      catchAndShoot: isCatchAndShoot,
      pullUp: isPullUp,
      quarter: numberValue(table, row, "PERIOD"),
      clutch: false
    });

    return {
      id: `${gameId}-${gameEventId}-${playerId}`,
      possessionId: `${gameId}-${gameEventId}`,
      gameId,
      season,
      playerId,
      teamId,
      quarter: numberValue(table, row, "PERIOD"),
      clock: clock(numberValue(table, row, "MINUTES_REMAINING"), numberValue(table, row, "SECONDS_REMAINING")),
      x: numberValue(table, row, "LOC_X") / 10,
      y: numberValue(table, row, "LOC_Y") / 10,
      shotDistance: numberValue(table, row, "SHOT_DISTANCE"),
      shotZone: zone,
      shotType,
      pointsValue,
      made,
      assisted: false,
      dribblesBeforeShot: isCatchAndShoot ? 0 : isPullUp ? 4 : 1,
      touchTime: isCatchAndShoot ? 1.2 : isPullUp ? 4 : 2.5,
      defenderDistance: 0,
      closestDefender: "Not loaded",
      contestLevel: "Open",
      shotClock: 12,
      expectedFgPct: model.expectedFgPct,
      expectedPoints: model.expectedPoints,
      actualMinusExpected: (made ? pointsValue : 0) - model.expectedPoints,
      playType: actionType || shotType,
      isClutch: false,
      isTransition: actionType.toLowerCase().includes("transition"),
      isCatchAndShoot,
      isPullUp,
      isAtRim: zone === "Rim",
      isCornerThree: zone === "Corner Three",
      isAboveBreakThree: zone === "Above Break Three"
    };
  });
}

export function nbaShotChartResultSetToTable(resultSet: unknown): ShotChartTable {
  if (!resultSet || typeof resultSet !== "object") return { headers: [], rows: [] };
  const maybeResultSet = resultSet as { headers?: unknown; rowSet?: unknown; rows?: unknown };
  const rows = Array.isArray(maybeResultSet.rowSet) ? maybeResultSet.rowSet : maybeResultSet.rows;
  return {
    headers: Array.isArray(maybeResultSet.headers) ? maybeResultSet.headers.map(String) : [],
    rows: Array.isArray(rows) ? (rows as unknown[][]) : []
  };
}
