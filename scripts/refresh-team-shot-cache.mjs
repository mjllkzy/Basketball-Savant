import fs from "node:fs/promises";
import path from "node:path";
import snapshot from "../src/lib/data/generated/official-snapshot.json" with { type: "json" };

const outputPath = path.join(process.cwd(), "src/lib/data/generated/team-shot-charts.json");
const season = snapshot.metadata.season;
const seasonType = "Regular Season";

const nbaStatsHeaders = {
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nba.com",
  Referer: "https://www.nba.com/",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true"
};

function tableValue(table, row, key) {
  return row[table.headers.indexOf(key)];
}

function numberValue(table, row, key) {
  const raw = tableValue(table, row, key);
  const numeric = typeof raw === "number" ? raw : Number(raw ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function stringValue(table, row, key) {
  const raw = tableValue(table, row, key);
  return raw === null || raw === undefined ? "" : String(raw);
}

function expectedFgPct(zone, pointsValue, actionType) {
  let fg = 0.43;
  if (zone === "Rim") fg = 0.67;
  if (zone === "Short Midrange") fg = 0.45;
  if (zone === "Long Midrange") fg = 0.41;
  if (zone === "Corner Three") fg = 0.39;
  if (zone === "Above Break Three") fg = 0.36;
  const action = actionType.toLowerCase();
  if (action.includes("dunk") || action.includes("layup")) fg += 0.03;
  if (action.includes("pullup") || action.includes("step back")) fg -= 0.025;
  if (pointsValue === 3 && action.includes("catch")) fg += 0.015;
  return Math.max(0.2, Math.min(0.78, fg));
}

function shotZone(zoneBasic, zoneRange, shotType) {
  if (zoneBasic === "Restricted Area") return "Rim";
  if (zoneBasic.includes("Corner 3")) return "Corner Three";
  if (zoneBasic.includes("Above the Break 3") || shotType.startsWith("3PT")) return "Above Break Three";
  if (zoneRange === "16-24 ft.") return "Long Midrange";
  return "Short Midrange";
}

function actionShotType(actionType) {
  const action = actionType.toLowerCase();
  if (action.includes("dunk")) return "Dunk";
  if (action.includes("layup")) return "Layup";
  if (action.includes("floating") || action.includes("floater")) return "Floater";
  if (action.includes("pullup") || action.includes("pull-up")) return "Pull-Up";
  if (action.includes("step back") || action.includes("stepback")) return "Stepback";
  if (action.includes("hook")) return "Hook";
  return "Jump Shot";
}

function teamIds() {
  const table = snapshot.tables.teamStatsRegular;
  const index = table.headers.indexOf("TEAM_ID");
  return table.rows.map((row) => String(row[index]));
}

function shotChartUrl(teamId) {
  const params = new URLSearchParams({
    CFID: "",
    CFPARAMS: "",
    ContextFilter: "",
    ContextMeasure: "FGA",
    DateFrom: "",
    DateTo: "",
    GameID: "",
    GameSegment: "",
    LastNGames: "0",
    LeagueID: "00",
    Location: "",
    Month: "0",
    OpponentTeamID: "0",
    Outcome: "",
    Period: "0",
    PlayerID: "0",
    Position: "",
    RookieYear: "",
    Season: season,
    SeasonSegment: "",
    SeasonType: seasonType,
    TeamID: teamId,
    VsConference: "",
    VsDivision: ""
  });
  return `https://stats.nba.com/stats/shotchartdetail?${params.toString()}`;
}

async function fetchTeam(teamId) {
  const response = await fetch(shotChartUrl(teamId), { headers: nbaStatsHeaders });
  if (!response.ok) throw new Error(`NBA Stats request failed for ${teamId}: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const resultSet = payload.resultSets?.[0] ?? payload.resultsets?.[0];
  const table = { headers: resultSet?.headers ?? [], rows: resultSet?.rowSet ?? [] };
  return table.rows.map((row) => {
    const gameId = stringValue(table, row, "GAME_ID");
    const gameEventId = stringValue(table, row, "GAME_EVENT_ID");
    const playerId = String(numberValue(table, row, "PLAYER_ID"));
    const actionType = stringValue(table, row, "ACTION_TYPE");
    const nbaShotType = stringValue(table, row, "SHOT_TYPE");
    const zone = shotZone(stringValue(table, row, "SHOT_ZONE_BASIC"), stringValue(table, row, "SHOT_ZONE_RANGE"), nbaShotType);
    const pointsValue = nbaShotType.startsWith("3PT") ? 3 : 2;
    const expectedFg = expectedFgPct(zone, pointsValue, actionType);
    const expectedPoints = expectedFg * pointsValue;
    const made = numberValue(table, row, "SHOT_MADE_FLAG") === 1;
    const isCatchAndShoot = actionType.toLowerCase().includes("catch");
    const isPullUp = actionShotType(actionType) === "Pull-Up";
    return [
      `${gameId}-${gameEventId}-${playerId}`,
      `${gameId}-${gameEventId}`,
      gameId,
      season,
      playerId,
      String(numberValue(table, row, "TEAM_ID")),
      numberValue(table, row, "PERIOD"),
      `${numberValue(table, row, "MINUTES_REMAINING")}:${String(numberValue(table, row, "SECONDS_REMAINING")).padStart(2, "0")}`,
      numberValue(table, row, "LOC_X") / 10,
      numberValue(table, row, "LOC_Y") / 10,
      numberValue(table, row, "SHOT_DISTANCE"),
      zone,
      actionShotType(actionType),
      pointsValue,
      made ? 1 : 0,
      actionType || actionShotType(actionType),
      expectedFg,
      expectedPoints,
      (made ? pointsValue : 0) - expectedPoints,
      actionType.toLowerCase().includes("transition") ? 1 : 0,
      isCatchAndShoot ? 1 : 0,
      isPullUp ? 1 : 0,
      zone === "Rim" ? 1 : 0,
      zone === "Corner Three" ? 1 : 0,
      zone === "Above Break Three" ? 1 : 0
    ];
  });
}

const teams = {};
for (const teamId of teamIds()) {
  teams[teamId] = await fetchTeam(teamId);
  console.log(`${teamId}: ${teams[teamId].length} shots`);
}

await fs.writeFile(outputPath, JSON.stringify({
  metadata: {
    season,
    seasonType,
    source: "NBA Stats shotchartdetail",
    generatedAt: new Date().toISOString()
  },
  teams
}));
