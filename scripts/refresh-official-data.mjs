import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const season = argValue("--season") ?? "2025-26";
const primarySeasonType = argValue("--seasonType") ?? "Regular Season";
const includeRegularSeasonShots = process.argv.includes("--regular-season-shots");
const includePlayoffShots = !process.argv.includes("--no-playoff-shots");
const includeRosters = process.argv.includes("--include-rosters");
const includeTeamGameLogs = process.argv.includes("--include-team-game-logs");
const includePlayerGameLogs = process.argv.includes("--include-player-game-logs");
const allowPartial = process.argv.includes("--allow-partial");
const reuseExistingCore = process.argv.includes("--reuse-existing-core");
const output = argValue("--output") ?? "src/lib/data/generated/official-snapshot.json";
const timeoutMs = Number(argValue("--timeoutMs") ?? 60000);
const retryCount = Math.max(1, Number(argValue("--retries") ?? 3));

const externalPlayerBioOverrides = [
  {
    playerId: "1642959",
    playerName: "Chris Youngblood",
    field: "weight",
    value: 221,
    sourceName: "Basketball Reference",
    sourceUrl: "https://www.basketball-reference.com/players/y/youngch01.html",
    note: "NBA Stats player index and player bio stats leave weight blank."
  },
  {
    playerId: "1643141",
    playerName: "Jahmyl Telfort",
    field: "weight",
    value: 225,
    sourceName: "Basketball Reference",
    sourceUrl: "https://www.basketball-reference.com/players/t/telfoja01.html",
    note: "NBA Stats player index and player bio stats leave weight blank."
  },
  {
    playerId: "1642377",
    playerName: "Jaylen Wells",
    field: "weight",
    value: 206,
    sourceName: "Basketball Reference",
    sourceUrl: "https://www.basketball-reference.com/players/w/wellsja01.html",
    note: "NBA Stats player index and player bio stats leave weight blank."
  },
  {
    playerId: "1643018",
    playerName: "LJ Cryer",
    field: "weight",
    value: 200,
    sourceName: "Basketball Reference G League",
    sourceUrl: "https://www.basketball-reference.com/gleague/players/c/cryerlj01d.html",
    note: "NBA Stats player index and player bio stats leave weight blank."
  },
  {
    playerId: "1643133",
    playerName: "Lawson Lovering",
    field: "weight",
    value: 245,
    sourceName: "Basketball Reference",
    sourceUrl: "https://www.basketball-reference.com/players/l/loverla01.html",
    note: "NBA Stats player index and player bio stats leave weight blank."
  },
  {
    playerId: "1642449",
    playerName: "Tolu Smith",
    field: "weight",
    value: 254,
    sourceName: "Basketball Reference",
    sourceUrl: "https://www.basketball-reference.com/players/s/smithto05.html",
    note: "NBA Stats player index and player bio stats leave weight blank."
  }
];

const publicReferenceGames = [
  {
    gameId: "0042500405",
    label: "2026 NBA Finals Game 5",
    date: "2026-06-13",
    awayTeamId: "1610612752",
    awayTeam: "New York Knicks",
    awayScore: 94,
    homeTeamId: "1610612759",
    homeTeam: "San Antonio Spurs",
    homeScore: 90,
    sources: {
      nba: "https://www.nba.com/game/0042500405/box-score",
      basketballReference: "https://www.basketball-reference.com/boxscores/202606130SAS.html",
      espn: "https://www.espn.com/nba/game/_/gameId/401859967/knicks-spurs"
    }
  },
  {
    gameId: "0042500404",
    label: "2026 NBA Finals Game 4",
    date: "2026-06-10",
    awayTeamId: "1610612759",
    awayTeam: "San Antonio Spurs",
    awayScore: 106,
    homeTeamId: "1610612752",
    homeTeam: "New York Knicks",
    homeScore: 107,
    sources: {
      nba: "https://www.nba.com/game/0042500404/box-score",
      basketballReference: "https://www.basketball-reference.com/boxscores/202606100NYK.html",
      espn: "https://www.espn.com/nba/game/_/gameId/401859966/spurs-knicks"
    }
  },
  {
    gameId: "0042500403",
    label: "2026 NBA Finals Game 3",
    date: "2026-06-08",
    awayTeamId: "1610612759",
    awayTeam: "San Antonio Spurs",
    awayScore: 115,
    homeTeamId: "1610612752",
    homeTeam: "New York Knicks",
    homeScore: 111,
    sources: {
      nba: "https://www.nba.com/game/0042500403/box-score",
      basketballReference: "https://www.basketball-reference.com/boxscores/202606080NYK.html",
      espn: "https://www.espn.com/nba/game/_/gameId/401859965/spurs-knicks"
    }
  },
  {
    gameId: "0042500402",
    label: "2026 NBA Finals Game 2",
    date: "2026-06-05",
    awayTeamId: "1610612752",
    awayTeam: "New York Knicks",
    awayScore: 105,
    homeTeamId: "1610612759",
    homeTeam: "San Antonio Spurs",
    homeScore: 104,
    sources: {
      nba: "https://www.nba.com/game/0042500402/box-score",
      basketballReference: "https://www.basketball-reference.com/boxscores/202606050SAS.html",
      espn: "https://www.espn.com/nba/game/_/gameId/401859964/knicks-spurs"
    }
  },
  {
    gameId: "0042500401",
    label: "2026 NBA Finals Game 1",
    date: "2026-06-03",
    awayTeamId: "1610612752",
    awayTeam: "New York Knicks",
    awayScore: 105,
    homeTeamId: "1610612759",
    homeTeam: "San Antonio Spurs",
    homeScore: 95,
    sources: {
      nba: "https://www.nba.com/game/0042500401/box-score",
      basketballReference: "https://www.basketball-reference.com/boxscores/202606030SAS.html",
      espn: "https://www.espn.com/nba/game/_/gameId/401859963/knicks-spurs"
    }
  }
];

const nbaHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nba.com",
  Referer: "https://www.nba.com/stats/"
};

function argValue(name) {
  const item = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : undefined;
}

function withParams(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchJson(name, url) {
  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      console.log(`Fetching ${name}${attempt > 1 ? ` (retry ${attempt})` : ""}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { headers: nbaHeaders, signal: controller.signal }).finally(() => clearTimeout(timeout));
      if (!response.ok) {
        throw new Error(`${name} failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt === retryCount) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw new Error(`${name} failed`);
}

async function fetchOptionalJson(name, url) {
  try {
    return await fetchJson(name, url);
  } catch (error) {
    console.warn(`Skipping ${name}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function baseDashParams(seasonType, teamId = 0) {
  return {
    MeasureType: "Base",
    PerMode: "Totals",
    PlusMinus: "N",
    PaceAdjust: "N",
    Rank: "N",
    LeagueID: "00",
    Season: season,
    SeasonType: seasonType,
    PORound: "0",
    Outcome: "",
    Location: "",
    Month: "0",
    SeasonSegment: "",
    DateFrom: "",
    DateTo: "",
    OpponentTeamID: "0",
    VsConference: "",
    VsDivision: "",
    TeamID: String(teamId),
    Conference: "",
    Division: "",
    GameSegment: "",
    Period: "0",
    ShotClockRange: "",
    LastNGames: "0",
    GameScope: ""
  };
}

function playerDashParams(seasonType, teamId = 0) {
  return {
    ...baseDashParams(seasonType, teamId),
    PlayerExperience: "",
    PlayerPosition: "",
    StarterBench: "",
    DraftYear: "",
    DraftPick: "",
    College: "",
    Country: "",
    Height: "",
    Weight: "",
    TwoWay: "0"
  };
}

function gameLogParams(seasonType, teamId = 0) {
  return {
    LeagueID: "00",
    Season: season,
    SeasonType: seasonType,
    TeamID: String(teamId),
    DateFrom: "",
    DateTo: "",
    GameSegment: "",
    LastNGames: "0",
    Location: "",
    MeasureType: "Base",
    Month: "0",
    OpponentTeamID: "0",
    Outcome: "",
    PORound: "0",
    PaceAdjust: "N",
    PerMode: "Totals",
    Period: "0",
    PlusMinus: "N",
    Rank: "N",
    SeasonSegment: "",
    ShotClockRange: "",
    VsConference: "",
    VsDivision: ""
  };
}

function playerGameLogParams(seasonType, teamId = 0) {
  return {
    ...gameLogParams(seasonType, teamId),
    PlayerID: ""
  };
}

function playerBioStatsParams(seasonType) {
  return {
    LeagueID: "00",
    Season: season,
    SeasonType: seasonType,
    PerMode: "Totals"
  };
}

function playerIndexParams() {
  return {
    LeagueID: "00",
    Season: season,
    Historical: "0"
  };
}

function shotChartParams(seasonType, teamId = 0) {
  return {
    AheadBehind: "",
    CFID: "",
    CFPARAMS: "",
    ClutchTime: "",
    ContextFilter: "",
    ContextMeasure: "FGA",
    DateFrom: "",
    DateTo: "",
    EndPeriod: "10",
    EndRange: "28800",
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
    PointDiff: "",
    Position: "",
    RangeType: "0",
    RookieYear: "",
    Season: season,
    SeasonSegment: "",
    SeasonType: seasonType,
    StartPeriod: "1",
    StartRange: "0",
    TeamID: String(teamId),
    VsConference: "",
    VsDivision: ""
  };
}

function table(json, index = 0) {
  const result = json.resultSets?.[index];
  if (!result) return { headers: [], rows: [] };
  return { headers: result.headers, rows: result.rowSet };
}

function snapshotOrResponseTable(json) {
  if (Array.isArray(json?.headers) && Array.isArray(json?.rows)) return json;
  return table(json);
}

function snapshotTableToJson(existingSnapshot, tableName) {
  const snapshotTable = existingSnapshot?.tables?.[tableName];
  if (!snapshotTable?.headers || !snapshotTable?.rows) {
    throw new Error(`--reuse-existing-core requested, but ${tableName} is missing from ${output}.`);
  }
  return { resultSets: [{ headers: snapshotTable.headers, rowSet: snapshotTable.rows }] };
}

async function readExistingSnapshot(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

function assertCoverage(condition, message) {
  if (condition) return;
  if (allowPartial) {
    console.warn(`Partial snapshot warning: ${message}`);
    return;
  }
  throw new Error(`${message} Pass --allow-partial to write a partial snapshot intentionally.`);
}

function missingIds(primaryTable, primaryKey, lookupTable, lookupKey) {
  const lookupIds = new Set(lookupTable.rows.map((row) => String(row[lookupTable.headers.indexOf(lookupKey)])));
  return primaryTable.rows
    .map((row) => String(row[primaryTable.headers.indexOf(primaryKey)]))
    .filter((id) => !lookupIds.has(id));
}

async function main() {
  const existingSnapshot = await readExistingSnapshot(output);
  const playerStatsRegularUrl = withParams("https://stats.nba.com/stats/leaguedashplayerstats", playerDashParams("Regular Season"));
  const playerStatsPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashplayerstats", playerDashParams("Playoffs"));
  const teamStatsRegularUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", baseDashParams("Regular Season"));
  const teamStatsPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", baseDashParams("Playoffs"));
  const teamGameLogsRegularUrl = withParams("https://stats.nba.com/stats/teamgamelogs", gameLogParams("Regular Season"));
  const teamGameLogsPlayoffsUrl = withParams("https://stats.nba.com/stats/teamgamelogs", gameLogParams("Playoffs"));
  const playerGameLogsRegularUrl = withParams("https://stats.nba.com/stats/playergamelogs", playerGameLogParams("Regular Season"));
  const playerGameLogsPlayoffsUrl = withParams("https://stats.nba.com/stats/playergamelogs", playerGameLogParams("Playoffs"));
  const playerBioStatsRegularUrl = withParams("https://stats.nba.com/stats/leaguedashplayerbiostats", playerBioStatsParams("Regular Season"));
  const playerIndexUrl = withParams("https://stats.nba.com/stats/playerindex", playerIndexParams());

  console.log(`Refreshing official NBA Stats snapshot for ${season}`);
  const emptyTable = { resultSets: [{ headers: [], rowSet: [] }] };
  const playerStatsRegular = reuseExistingCore ? snapshotTableToJson(existingSnapshot, "playerStatsRegular") : await fetchJson("regular player stats", playerStatsRegularUrl);
  const playerStatsPlayoffs = reuseExistingCore ? snapshotTableToJson(existingSnapshot, "playerStatsPlayoffs") : await fetchOptionalJson("playoff player stats", playerStatsPlayoffsUrl) ?? emptyTable;
  const teamStatsRegular = reuseExistingCore ? snapshotTableToJson(existingSnapshot, "teamStatsRegular") : await fetchJson("regular team stats", teamStatsRegularUrl);
  const teamStatsPlayoffs = reuseExistingCore ? snapshotTableToJson(existingSnapshot, "teamStatsPlayoffs") : await fetchOptionalJson("playoff team stats", teamStatsPlayoffsUrl) ?? emptyTable;
  const playerBioStatsRegular = await fetchJson("regular player bio stats", playerBioStatsRegularUrl);
  const playerIndex = await fetchJson("player index", playerIndexUrl);
  const fetchRequestedJson = allowPartial ? fetchOptionalJson : fetchJson;
  const teamGameLogsRegularMaybe = includeTeamGameLogs ? await fetchRequestedJson("regular team game logs", teamGameLogsRegularUrl) : undefined;
  const teamGameLogsPlayoffsMaybe = includeTeamGameLogs ? await fetchRequestedJson("playoff team game logs", teamGameLogsPlayoffsUrl) : undefined;
  const playerGameLogsRegularMaybe = includePlayerGameLogs ? await fetchRequestedJson("regular player game logs", playerGameLogsRegularUrl) : undefined;
  const playerGameLogsPlayoffsMaybe = includePlayerGameLogs ? await fetchRequestedJson("playoff player game logs", playerGameLogsPlayoffsUrl) : undefined;
  const teamGameLogsRegular = teamGameLogsRegularMaybe ?? emptyTable;
  const teamGameLogsPlayoffs = teamGameLogsPlayoffsMaybe ?? emptyTable;
  const playerGameLogsRegular = playerGameLogsRegularMaybe ?? emptyTable;
  const playerGameLogsPlayoffs = playerGameLogsPlayoffsMaybe ?? emptyTable;

  const teamRows = table(teamStatsRegular).rows;
  const teamIdList = teamRows.map((row) => row[0]);
  const rosters = includeRosters ? {} : existingSnapshot?.tables?.rosters ?? {};
  if (includeRosters) {
    for (const teamId of teamIdList) {
      const url = withParams("https://stats.nba.com/stats/commonteamroster", { LeagueID: "00", Season: season, TeamID: teamId });
      const roster = await fetchRequestedJson(`roster ${teamId}`, url);
      if (roster) rosters[teamId] = roster;
    }
  }
  const rosterTables = Object.fromEntries(Object.entries(rosters).map(([teamId, json]) => [teamId, snapshotOrResponseTable(json)]));
  const loadedRosterCount = Object.values(rosterTables).filter((rosterTable) => rosterTable.rows.length > 0).length;

  const shotCharts = {};
  if (includePlayoffShots) {
    const url = withParams("https://stats.nba.com/stats/shotchartdetail", shotChartParams("Playoffs"));
    shotCharts.playoffs = await fetchJson("playoff shot chart", url);
  }
  if (includeRegularSeasonShots) {
    const url = withParams("https://stats.nba.com/stats/shotchartdetail", shotChartParams("Regular Season"));
    shotCharts.regularSeason = await fetchJson("regular season shot chart", url);
  }

  const snapshot = {
    metadata: {
      generatedAt: new Date().toISOString(),
      season,
      primarySeasonType,
      dataProvider: "NBA Stats",
      reusedCoreGeneratedAt: reuseExistingCore ? existingSnapshot?.metadata?.generatedAt : undefined,
      sourceNotes: [
        "Official NBA Stats public JSON endpoints.",
        ...(reuseExistingCore && existingSnapshot?.metadata?.generatedAt
          ? [`Aggregate player and team tables were reused from the existing official snapshot generated at ${existingSnapshot.metadata.generatedAt}.`]
          : []),
        "Basketball Reference, NBA.com box scores, and ESPN game pages are listed as cross-reference sources for public score and series verification.",
        "The publicReferenceGames metadata pins the currently displayed NBA Finals games to public NBA.com, Basketball Reference, and ESPN game pages.",
        "When NBA Stats leaves selected player bio fields blank, explicit Basketball Reference fallback rows are stored in the playerBioOverrides table.",
        "Basketball Savant derived metrics are calculated locally from official box score totals.",
        "Tracking-only metrics are unavailable unless a licensed tracking source is connected."
      ],
      publicReferenceGames,
      sources: {
        nbaStatsHome: "https://www.nba.com/stats",
        nbaFinalsGame5BoxScore: "https://www.nba.com/game/0042500405/box-score",
        basketballReferenceHome: "https://www.basketball-reference.com/",
        basketballReferencePlayoffs2026: "https://www.basketball-reference.com/playoffs/NBA_2026.html",
        basketballReferenceFinals2026: "https://www.basketball-reference.com/playoffs/2026-nba-finals-knicks-vs-spurs.html",
        basketballReferenceFinalsGame5: "https://www.basketball-reference.com/boxscores/202606130SAS.html",
        espnFinalsGame5: "https://www.espn.com/nba/game/_/gameId/401859967/knicks-spurs",
        playerStatsRegularUrl,
        playerStatsPlayoffsUrl,
        playerBioStatsRegularUrl,
        playerIndexUrl,
        teamStatsRegularUrl,
        teamStatsPlayoffsUrl,
        teamGameLogsRegularUrl,
        teamGameLogsPlayoffsUrl,
        playerGameLogsRegularUrl,
        playerGameLogsPlayoffsUrl
      },
      coverage: {
        regularSeasonPlayerStats: table(playerStatsRegular).rows.length,
        playoffPlayerStats: table(playerStatsPlayoffs).rows.length,
        regularSeasonPlayerBioStats: table(playerBioStatsRegular).rows.length,
        playerIndex: table(playerIndex).rows.length,
        externalPlayerBioOverrides: externalPlayerBioOverrides.length,
        regularSeasonTeamStats: table(teamStatsRegular).rows.length,
        playoffTeamStats: table(teamStatsPlayoffs).rows.length,
        regularSeasonTeamGameLogs: table(teamGameLogsRegular).rows.length,
        playoffTeamGameLogs: table(teamGameLogsPlayoffs).rows.length,
        regularSeasonPlayerGameLogs: table(playerGameLogsRegular).rows.length,
        playoffPlayerGameLogs: table(playerGameLogsPlayoffs).rows.length,
        rosters: loadedRosterCount,
        playoffShots: shotCharts.playoffs ? table(shotCharts.playoffs).rows.length : 0,
        regularSeasonShots: shotCharts.regularSeason ? table(shotCharts.regularSeason).rows.length : 0
      }
    },
    tables: {
      playerStatsRegular: table(playerStatsRegular),
      playerStatsPlayoffs: table(playerStatsPlayoffs),
      playerBioStatsRegular: table(playerBioStatsRegular),
      playerIndex: table(playerIndex),
      playerBioOverrides: {
        headers: ["PLAYER_ID", "PLAYER_NAME", "FIELD", "VALUE", "SOURCE_NAME", "SOURCE_URL", "NOTE"],
        rows: externalPlayerBioOverrides.map((override) => [
          override.playerId,
          override.playerName,
          override.field,
          override.value,
          override.sourceName,
          override.sourceUrl,
          override.note
        ])
      },
      teamStatsRegular: table(teamStatsRegular),
      teamStatsPlayoffs: table(teamStatsPlayoffs),
      teamGameLogsRegular: table(teamGameLogsRegular),
      teamGameLogsPlayoffs: table(teamGameLogsPlayoffs),
      playerGameLogsRegular: table(playerGameLogsRegular),
      playerGameLogsPlayoffs: table(playerGameLogsPlayoffs),
      rosters: rosterTables,
      shotCharts: {
        playoffs: shotCharts.playoffs ? table(shotCharts.playoffs) : undefined,
        regularSeason: shotCharts.regularSeason ? table(shotCharts.regularSeason) : undefined
      }
    }
  };

  assertCoverage(
    !includeRosters || loadedRosterCount === teamIdList.length,
    `Roster refresh requested ${teamIdList.length} team rosters but loaded ${loadedRosterCount}.`
  );
  const playerStatsRegularTable = table(playerStatsRegular);
  const playerBioStatsRegularTable = table(playerBioStatsRegular);
  const playerIndexTable = table(playerIndex);
  const missingBioStatsIds = missingIds(playerStatsRegularTable, "PLAYER_ID", playerBioStatsRegularTable, "PLAYER_ID");
  const missingPlayerIndexIds = missingIds(playerStatsRegularTable, "PLAYER_ID", playerIndexTable, "PERSON_ID");
  assertCoverage(
    missingBioStatsIds.length === 0,
    `Player bio stats are missing ${missingBioStatsIds.length} regular-season player IDs: ${missingBioStatsIds.slice(0, 10).join(", ")}.`
  );
  assertCoverage(
    missingPlayerIndexIds.length === 0,
    `Player index is missing ${missingPlayerIndexIds.length} regular-season player IDs: ${missingPlayerIndexIds.slice(0, 10).join(", ")}.`
  );
  assertCoverage(
    !includeTeamGameLogs || table(teamStatsRegular).rows.length === 0 || table(teamGameLogsRegular).rows.length > 0,
    "Regular-season team game logs were requested but no rows were loaded."
  );
  assertCoverage(
    !includeTeamGameLogs || table(teamStatsPlayoffs).rows.length === 0 || table(teamGameLogsPlayoffs).rows.length > 0,
    "Playoff team game logs were requested but no rows were loaded."
  );
  assertCoverage(
    !includePlayerGameLogs || table(playerStatsRegular).rows.length === 0 || table(playerGameLogsRegular).rows.length > 0,
    "Regular-season player game logs were requested but no rows were loaded."
  );
  assertCoverage(
    !includePlayerGameLogs || table(playerStatsPlayoffs).rows.length === 0 || table(playerGameLogsPlayoffs).rows.length > 0,
    "Playoff player game logs were requested but no rows were loaded."
  );

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot)}\n`);
  console.log(`Wrote ${output}`);
  console.log(JSON.stringify(snapshot.metadata.coverage, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
