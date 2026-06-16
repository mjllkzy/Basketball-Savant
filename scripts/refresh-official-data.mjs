import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const season = argValue("--season") ?? "2025-26";
const primarySeasonType = argValue("--seasonType") ?? "Regular Season";
const includeRegularSeasonShots = process.argv.includes("--regular-season-shots");
const includePlayoffShots = !process.argv.includes("--no-playoff-shots");
const includeRosters = process.argv.includes("--include-rosters");
const includeTeamGameLogs = process.argv.includes("--include-team-game-logs");
const includePlayerGameLogs = process.argv.includes("--include-player-game-logs");
const output = argValue("--output") ?? "src/lib/data/generated/official-snapshot.json";
const timeoutMs = Number(argValue("--timeoutMs") ?? 20000);

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
  for (let attempt = 1; attempt <= 2; attempt += 1) {
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
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200));
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

async function main() {
  const playerStatsRegularUrl = withParams("https://stats.nba.com/stats/leaguedashplayerstats", playerDashParams("Regular Season"));
  const playerStatsPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashplayerstats", playerDashParams("Playoffs"));
  const teamStatsRegularUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", baseDashParams("Regular Season"));
  const teamStatsPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", baseDashParams("Playoffs"));
  const teamGameLogsRegularUrl = withParams("https://stats.nba.com/stats/teamgamelogs", gameLogParams("Regular Season"));
  const teamGameLogsPlayoffsUrl = withParams("https://stats.nba.com/stats/teamgamelogs", gameLogParams("Playoffs"));
  const playerGameLogsRegularUrl = withParams("https://stats.nba.com/stats/playergamelogs", playerGameLogParams("Regular Season"));
  const playerGameLogsPlayoffsUrl = withParams("https://stats.nba.com/stats/playergamelogs", playerGameLogParams("Playoffs"));

  console.log(`Refreshing official NBA Stats snapshot for ${season}`);
  const emptyTable = { resultSets: [{ headers: [], rowSet: [] }] };
  const playerStatsRegular = await fetchJson("regular player stats", playerStatsRegularUrl);
  const playerStatsPlayoffs = await fetchOptionalJson("playoff player stats", playerStatsPlayoffsUrl) ?? emptyTable;
  const teamStatsRegular = await fetchJson("regular team stats", teamStatsRegularUrl);
  const teamStatsPlayoffs = await fetchOptionalJson("playoff team stats", teamStatsPlayoffsUrl) ?? emptyTable;
  const teamGameLogsRegularMaybe = includeTeamGameLogs ? await fetchOptionalJson("regular team game logs", teamGameLogsRegularUrl) : undefined;
  const teamGameLogsPlayoffsMaybe = includeTeamGameLogs ? await fetchOptionalJson("playoff team game logs", teamGameLogsPlayoffsUrl) : undefined;
  const playerGameLogsRegularMaybe = includePlayerGameLogs ? await fetchOptionalJson("regular player game logs", playerGameLogsRegularUrl) : undefined;
  const playerGameLogsPlayoffsMaybe = includePlayerGameLogs ? await fetchOptionalJson("playoff player game logs", playerGameLogsPlayoffsUrl) : undefined;
  const teamGameLogsRegular = teamGameLogsRegularMaybe ?? emptyTable;
  const teamGameLogsPlayoffs = teamGameLogsPlayoffsMaybe ?? emptyTable;
  const playerGameLogsRegular = playerGameLogsRegularMaybe ?? emptyTable;
  const playerGameLogsPlayoffs = playerGameLogsPlayoffsMaybe ?? emptyTable;

  const teamRows = table(teamStatsRegular).rows;
  const teamIdList = teamRows.map((row) => row[0]);
  const rosters = {};
  if (includeRosters) {
    for (const teamId of teamIdList) {
      const url = withParams("https://stats.nba.com/stats/commonteamroster", { LeagueID: "00", Season: season, TeamID: teamId });
      const roster = await fetchOptionalJson(`roster ${teamId}`, url);
      if (roster) rosters[teamId] = roster;
    }
  }

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
      sourceNotes: [
        "Official NBA Stats public JSON endpoints.",
        "Basketball-Reference-style derived metrics are calculated locally from official box score totals.",
        "Tracking-only metrics are unavailable unless a licensed tracking source is connected."
      ],
      sources: {
        nbaStatsHome: "https://www.nba.com/stats",
        playerStatsRegularUrl,
        playerStatsPlayoffsUrl,
        teamStatsRegularUrl,
        teamStatsPlayoffsUrl,
        teamGameLogsRegularUrl,
        teamGameLogsPlayoffsUrl,
        playerGameLogsRegularUrl,
        playerGameLogsPlayoffsUrl,
        finals: "https://www.nba.com/playoffs/2026/nba-finals",
        finalsStats: "https://www.nba.com/playoffs/2026/nba-finals/stats"
      },
      coverage: {
        regularSeasonPlayerStats: table(playerStatsRegular).rows.length,
        playoffPlayerStats: table(playerStatsPlayoffs).rows.length,
        regularSeasonTeamStats: table(teamStatsRegular).rows.length,
        playoffTeamStats: table(teamStatsPlayoffs).rows.length,
        regularSeasonTeamGameLogs: table(teamGameLogsRegular).rows.length,
        playoffTeamGameLogs: table(teamGameLogsPlayoffs).rows.length,
        regularSeasonPlayerGameLogs: table(playerGameLogsRegular).rows.length,
        playoffPlayerGameLogs: table(playerGameLogsPlayoffs).rows.length,
        rosters: Object.keys(rosters).length,
        playoffShots: shotCharts.playoffs ? table(shotCharts.playoffs).rows.length : 0,
        regularSeasonShots: shotCharts.regularSeason ? table(shotCharts.regularSeason).rows.length : 0
      }
    },
    tables: {
      playerStatsRegular: table(playerStatsRegular),
      playerStatsPlayoffs: table(playerStatsPlayoffs),
      teamStatsRegular: table(teamStatsRegular),
      teamStatsPlayoffs: table(teamStatsPlayoffs),
      teamGameLogsRegular: table(teamGameLogsRegular),
      teamGameLogsPlayoffs: table(teamGameLogsPlayoffs),
      playerGameLogsRegular: table(playerGameLogsRegular),
      playerGameLogsPlayoffs: table(playerGameLogsPlayoffs),
      rosters: Object.fromEntries(Object.entries(rosters).map(([teamId, json]) => [teamId, table(json)])),
      shotCharts: {
        playoffs: shotCharts.playoffs ? table(shotCharts.playoffs) : undefined,
        regularSeason: shotCharts.regularSeason ? table(shotCharts.regularSeason) : undefined
      }
    }
  };

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot)}\n`);
  console.log(`Wrote ${output}`);
  console.log(JSON.stringify(snapshot.metadata.coverage, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
