import { describe, expect, it } from "vitest";
import { mapNbaShotChartTable, nbaShotChartResultSetToTable } from "@/lib/data/shotChartMapper";

const headers = [
  "GRID_TYPE",
  "GAME_ID",
  "GAME_EVENT_ID",
  "PLAYER_ID",
  "PLAYER_NAME",
  "TEAM_ID",
  "TEAM_NAME",
  "PERIOD",
  "MINUTES_REMAINING",
  "SECONDS_REMAINING",
  "EVENT_TYPE",
  "ACTION_TYPE",
  "SHOT_TYPE",
  "SHOT_ZONE_BASIC",
  "SHOT_ZONE_AREA",
  "SHOT_ZONE_RANGE",
  "SHOT_DISTANCE",
  "LOC_X",
  "LOC_Y",
  "SHOT_ATTEMPTED_FLAG",
  "SHOT_MADE_FLAG",
  "GAME_DATE",
  "HTM",
  "VTM"
];

describe("NBA shot chart mapper", () => {
  it("maps NBA Stats shotchartdetail rows into court-ready shot events", () => {
    const shots = mapNbaShotChartTable({
      headers,
      rows: [[
        "Shot Chart Detail",
        "0022500014",
        7,
        1629638,
        "Nickeil Alexander-Walker",
        1610612737,
        "Atlanta Hawks",
        1,
        11,
        43,
        "Missed Shot",
        "Jump Shot",
        "3PT Field Goal",
        "Above the Break 3",
        "Right Side Center(RC)",
        "24+ ft.",
        26,
        175,
        202,
        1,
        0,
        "20260119",
        "ATL",
        "MIL"
      ]]
    }, "2025-26");

    expect(shots).toHaveLength(1);
    expect(shots[0]).toMatchObject({
      id: "0022500014-7-1629638",
      gameId: "0022500014",
      season: "2025-26",
      playerId: "1629638",
      teamId: "1610612737",
      quarter: 1,
      clock: "11:43",
      x: 17.5,
      y: 20.2,
      shotDistance: 26,
      shotZone: "Above Break Three",
      shotType: "Jump Shot",
      pointsValue: 3,
      made: false
    });
    expect(shots[0].expectedPoints).toBeGreaterThan(0);
  });

  it("accepts a raw NBA Stats resultSet payload shape", () => {
    const table = nbaShotChartResultSetToTable({ headers, rowSet: [] });
    expect(table.headers).toEqual(headers);
    expect(table.rows).toEqual([]);
  });
});
