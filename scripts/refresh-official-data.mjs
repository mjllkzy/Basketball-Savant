import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const season = argValue("--season") ?? "2025-26";
const primarySeasonType = argValue("--seasonType") ?? "Regular Season";
const includeRegularSeasonShots = process.argv.includes("--regular-season-shots");
const includePlayoffShots = !process.argv.includes("--no-playoff-shots");
const includeRosters = process.argv.includes("--include-rosters");
const includeTeamGameLogs = process.argv.includes("--include-team-game-logs");
const includePlayerGameLogs = process.argv.includes("--include-player-game-logs");
const includeBasketballReferenceCrosscheck = !process.argv.includes("--skip-bref-crosscheck");
const allowPartial = process.argv.includes("--allow-partial");
const reuseExistingCore = process.argv.includes("--reuse-existing-core");
const output = argValue("--output") ?? "src/lib/data/generated/official-snapshot.json";
const timeoutMs = Number(argValue("--timeoutMs") ?? 60000);
const retryCount = Math.max(1, Number(argValue("--retries") ?? 3));
const basketballReferencePlayerAdvancedUrl = "https://www.basketball-reference.com/leagues/NBA_2026_advanced.html";
const basketballReferencePlayerPerGameUrl = "https://www.basketball-reference.com/leagues/NBA_2026_per_game.html";
const basketballReferenceTeamAdvancedUrl = "https://www.basketball-reference.com/leagues/NBA_2026.html";

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

const nbaPageHeaders = {
  ...nbaHeaders,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://www.nba.com/"
};

const basketballReferenceHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

const basketballReferencePlayerNameAliases = {
  "adama bal": ["adama alpha bal"],
  "ronald holland": ["ron holland"],
  "trevon scott": ["tre scott"]
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

async function fetchText(name, url, headers) {
  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      console.log(`Fetching ${name}${attempt > 1 ? ` (retry ${attempt})` : ""}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timeout));
      if (!response.ok) {
        throw new Error(`${name} failed: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      if (attempt === retryCount) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw new Error(`${name} failed`);
}

async function fetchOptionalText(name, url, headers) {
  try {
    return await fetchText(name, url, headers);
  } catch (error) {
    console.warn(`Skipping ${name}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizePlayerName(value) {
  return decodeHtml(String(value ?? ""))
    .replace(/[ёЁ]/g, "e")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\u2019']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamName(value) {
  const normalized = decodeHtml(String(value ?? ""))
    .replace(/\*/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized === "la clippers" ? "los angeles clippers" : normalized;
}

function basketballReferenceTeamForNba(teamAbbreviation) {
  return (
    {
      BKN: "BRK",
      CHA: "CHO",
      PHX: "PHO"
    }[teamAbbreviation] ?? teamAbbreviation
  );
}

function cellHtml(rowHtml, stat) {
  const match = rowHtml.match(new RegExp(`<(?:td|th)[^>]*data-stat="${stat}"[^>]*>[\\s\\S]*?<\\/(?:td|th)>`));
  return match?.[0];
}

function cellText(rowHtml, stat) {
  const cell = cellHtml(rowHtml, stat);
  if (!cell) return "";
  const inner = cell.replace(/^<[^>]+>/, "").replace(/<\/(?:td|th)>$/, "");
  return decodeHtml(inner);
}

function cellNumericValue(rowHtml, stat) {
  const cell = cellHtml(rowHtml, stat);
  if (!cell) return null;
  const raw = (cell.match(/csk="([^"]*)"/)?.[1] ?? cellText(rowHtml, stat)).replace(/,/g, "");
  if (raw === "") return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseBasketballReferenceRows(html, tableId, fields) {
  const withoutComments = html.replace(/<!--/g, "").replace(/-->/g, "");
  const tableHtml = withoutComments.match(new RegExp(`<table[^>]+id="${tableId}"[\\s\\S]*?<\\/table>`))?.[0] ?? "";
  return [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .filter((rowHtml) => rowHtml.includes("<td") && rowHtml.includes('data-stat="name_display"'))
    .map((rowHtml) => {
      const row = {
        playerName: cellText(rowHtml, "name_display"),
        normalizedPlayerName: normalizePlayerName(cellText(rowHtml, "name_display")),
        teamAbbreviation: cellText(rowHtml, "team_name_abbr"),
        position: cellText(rowHtml, "pos"),
        games: cellNumericValue(rowHtml, "games"),
        minutes: cellNumericValue(rowHtml, "mp")
      };
      for (const [outputKey, stat] of Object.entries(fields)) {
        row[outputKey] = cellNumericValue(rowHtml, stat);
      }
      return row;
    });
}

function basketballReferenceRowsByName(rows) {
  const byName = new Map();
  for (const row of rows) {
    if (!row.normalizedPlayerName) continue;
    const existing = byName.get(row.normalizedPlayerName) ?? [];
    existing.push(row);
    byName.set(row.normalizedPlayerName, existing);
  }
  return byName;
}

function findBasketballReferenceMatch(rowsByName, playerName, teamAbbreviation, teamCount) {
  const normalizedPlayerName = normalizePlayerName(playerName);
  const aliasCandidates = (basketballReferencePlayerNameAliases[normalizedPlayerName] ?? []).flatMap((alias) => rowsByName.get(normalizePlayerName(alias)) ?? []);
  const candidates = [...(rowsByName.get(normalizedPlayerName) ?? []), ...aliasCandidates];
  if (candidates.length === 0) return undefined;
  const aggregateTeams = new Set(["TOT", "2TM", "3TM", "4TM", "5TM"]);
  if (Number(teamCount) > 1) {
    const aggregate = candidates.find((row) => aggregateTeams.has(row.teamAbbreviation));
    if (aggregate) return aggregate;
  }
  const basketballReferenceTeam = basketballReferenceTeamForNba(teamAbbreviation);
  return (
    candidates.find((row) => row.teamAbbreviation === basketballReferenceTeam) ??
    candidates.find((row) => aggregateTeams.has(row.teamAbbreviation)) ??
    (candidates.length === 1 ? candidates[0] : undefined)
  );
}

function diff(nbaValue, referenceValue) {
  if (nbaValue === null || nbaValue === undefined || referenceValue === null || referenceValue === undefined) return null;
  return Number(Math.abs(Number(nbaValue) - Number(referenceValue)).toFixed(6));
}

function buildBasketballReferenceCrosscheck(playerAdvancedRegular, advancedRows, perGameRows) {
  const nbaTable = table(playerAdvancedRegular);
  const advancedByName = basketballReferenceRowsByName(advancedRows);
  const perGameByName = basketballReferenceRowsByName(perGameRows);
  const headerIndex = Object.fromEntries(nbaTable.headers.map((header, index) => [header, index]));
  const rows = nbaTable.rows.map((row) => {
    const playerId = String(row[headerIndex.PLAYER_ID]);
    const playerName = row[headerIndex.PLAYER_NAME];
    const nbaTeam = row[headerIndex.TEAM_ABBREVIATION];
    const teamCount = row[headerIndex.TEAM_COUNT];
    const advancedMatch = findBasketballReferenceMatch(advancedByName, playerName, nbaTeam, teamCount);
    const perGameMatch = findBasketballReferenceMatch(perGameByName, playerName, nbaTeam, teamCount);
    const status = advancedMatch && perGameMatch ? "matched" : advancedMatch ? "missing_per_game" : perGameMatch ? "missing_advanced" : "unmatched";
    return [
      playerId,
      playerName,
      nbaTeam,
      advancedMatch?.teamAbbreviation ?? "",
      perGameMatch?.teamAbbreviation ?? "",
      status,
      perGameMatch?.position ?? "",
      perGameMatch?.gamesStarted ?? null,
      row[headerIndex.TS_PCT],
      advancedMatch?.tsPct ?? null,
      diff(row[headerIndex.TS_PCT], advancedMatch?.tsPct),
      row[headerIndex.EFG_PCT],
      perGameMatch?.efgPct ?? null,
      diff(row[headerIndex.EFG_PCT], perGameMatch?.efgPct),
      row[headerIndex.USG_PCT],
      advancedMatch?.usagePct ?? null,
      diff(row[headerIndex.USG_PCT], advancedMatch?.usagePct),
      row[headerIndex.AST_PCT],
      advancedMatch?.assistPct ?? null,
      diff(row[headerIndex.AST_PCT], advancedMatch?.assistPct),
      row[headerIndex.OREB_PCT],
      advancedMatch?.offensiveReboundPct ?? null,
      diff(row[headerIndex.OREB_PCT], advancedMatch?.offensiveReboundPct),
      row[headerIndex.DREB_PCT],
      advancedMatch?.defensiveReboundPct ?? null,
      diff(row[headerIndex.DREB_PCT], advancedMatch?.defensiveReboundPct),
      row[headerIndex.REB_PCT],
      advancedMatch?.reboundPct ?? null,
      diff(row[headerIndex.REB_PCT], advancedMatch?.reboundPct)
    ];
  });
  return {
    headers: [
      "PLAYER_ID",
      "PLAYER_NAME",
      "NBA_TEAM_ABBREVIATION",
      "BREF_ADVANCED_TEAM_ABBREVIATION",
      "BREF_PER_GAME_TEAM_ABBREVIATION",
      "MATCH_STATUS",
      "BREF_POSITION",
      "BREF_GS",
      "NBA_TS_PCT",
      "BREF_TS_PCT",
      "TS_PCT_ABS_DIFF",
      "NBA_EFG_PCT",
      "BREF_EFG_PCT",
      "EFG_PCT_ABS_DIFF",
      "NBA_USG_PCT",
      "BREF_USG_PCT",
      "USG_PCT_ABS_DIFF",
      "NBA_AST_PCT",
      "BREF_AST_PCT",
      "AST_PCT_ABS_DIFF",
      "NBA_OREB_PCT",
      "BREF_ORB_PCT",
      "OREB_PCT_ABS_DIFF",
      "NBA_DREB_PCT",
      "BREF_DRB_PCT",
      "DREB_PCT_ABS_DIFF",
      "NBA_REB_PCT",
      "BREF_TRB_PCT",
      "REB_PCT_ABS_DIFF"
    ],
    rows
  };
}

function parseBasketballReferenceTeamAdvancedRows(html) {
  const withoutComments = html.replace(/<!--/g, "").replace(/-->/g, "");
  const tableHtml = withoutComments.match(/<table[^>]+id="advanced-team"[\s\S]*?<\/table>/)?.[0] ?? "";
  return [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .filter((rowHtml) => rowHtml.includes("<td") && rowHtml.includes('data-stat="team"'))
    .map((rowHtml) => ({
      teamName: cellText(rowHtml, "team").replace(/\*/g, "").trim(),
      normalizedTeamName: normalizeTeamName(cellText(rowHtml, "team")),
      offRating: cellNumericValue(rowHtml, "off_rtg"),
      defRating: cellNumericValue(rowHtml, "def_rtg"),
      netRating: cellNumericValue(rowHtml, "net_rtg"),
      pace: cellNumericValue(rowHtml, "pace"),
      tsPct: cellNumericValue(rowHtml, "ts_pct"),
      efgPct: cellNumericValue(rowHtml, "efg_pct"),
      turnoverPct: cellNumericValue(rowHtml, "tov_pct") === null ? null : cellNumericValue(rowHtml, "tov_pct") / 100,
      offensiveReboundPct: cellNumericValue(rowHtml, "orb_pct") === null ? null : cellNumericValue(rowHtml, "orb_pct") / 100,
      defensiveReboundPct: cellNumericValue(rowHtml, "drb_pct") === null ? null : cellNumericValue(rowHtml, "drb_pct") / 100
    }))
    .filter((row) => row.normalizedTeamName !== "league average");
}

function buildBasketballReferenceTeamAdvancedCrosscheck(teamAdvancedRegular, basketballReferenceRows) {
  const nbaTable = table(teamAdvancedRegular);
  const referenceByName = new Map(basketballReferenceRows.map((row) => [row.normalizedTeamName, row]));
  const headerIndex = Object.fromEntries(nbaTable.headers.map((header, index) => [header, index]));
  const rows = nbaTable.rows.map((row) => {
    const teamName = row[headerIndex.TEAM_NAME];
    const reference = referenceByName.get(normalizeTeamName(teamName));
    const status = reference ? "matched" : "unmatched";
    return [
      String(row[headerIndex.TEAM_ID]),
      teamName,
      reference?.teamName ?? "",
      status,
      row[headerIndex.OFF_RATING],
      reference?.offRating ?? null,
      diff(row[headerIndex.OFF_RATING], reference?.offRating),
      row[headerIndex.DEF_RATING],
      reference?.defRating ?? null,
      diff(row[headerIndex.DEF_RATING], reference?.defRating),
      row[headerIndex.NET_RATING],
      reference?.netRating ?? null,
      diff(row[headerIndex.NET_RATING], reference?.netRating),
      row[headerIndex.PACE],
      reference?.pace ?? null,
      diff(row[headerIndex.PACE], reference?.pace),
      row[headerIndex.TS_PCT],
      reference?.tsPct ?? null,
      diff(row[headerIndex.TS_PCT], reference?.tsPct),
      row[headerIndex.EFG_PCT],
      reference?.efgPct ?? null,
      diff(row[headerIndex.EFG_PCT], reference?.efgPct),
      row[headerIndex.TM_TOV_PCT],
      reference?.turnoverPct ?? null,
      diff(row[headerIndex.TM_TOV_PCT], reference?.turnoverPct),
      row[headerIndex.OREB_PCT],
      reference?.offensiveReboundPct ?? null,
      diff(row[headerIndex.OREB_PCT], reference?.offensiveReboundPct),
      row[headerIndex.DREB_PCT],
      reference?.defensiveReboundPct ?? null,
      diff(row[headerIndex.DREB_PCT], reference?.defensiveReboundPct)
    ];
  });
  return {
    headers: [
      "TEAM_ID",
      "NBA_TEAM_NAME",
      "BREF_TEAM_NAME",
      "MATCH_STATUS",
      "NBA_OFF_RATING",
      "BREF_OFF_RTG",
      "OFF_RATING_ABS_DIFF",
      "NBA_DEF_RATING",
      "BREF_DEF_RTG",
      "DEF_RATING_ABS_DIFF",
      "NBA_NET_RATING",
      "BREF_NET_RTG",
      "NET_RATING_ABS_DIFF",
      "NBA_PACE",
      "BREF_PACE",
      "PACE_ABS_DIFF",
      "NBA_TS_PCT",
      "BREF_TS_PCT",
      "TS_PCT_ABS_DIFF",
      "NBA_EFG_PCT",
      "BREF_EFG_PCT",
      "EFG_PCT_ABS_DIFF",
      "NBA_TM_TOV_PCT",
      "BREF_TOV_PCT",
      "TM_TOV_PCT_ABS_DIFF",
      "NBA_OREB_PCT",
      "BREF_ORB_PCT",
      "OREB_PCT_ABS_DIFF",
      "NBA_DREB_PCT",
      "BREF_DRB_PCT",
      "DREB_PCT_ABS_DIFF"
    ],
    rows
  };
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

function advancedDashParams(seasonType, teamId = 0) {
  return {
    ...baseDashParams(seasonType, teamId),
    MeasureType: "Advanced"
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

function playerAdvancedDashParams(seasonType, teamId = 0) {
  return {
    ...advancedDashParams(seasonType, teamId),
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

const birthDateMonthNumbers = new Map(Object.entries({
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12
}));

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeBirthDate(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const shortMonth = text.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (shortMonth) {
    const month = birthDateMonthNumbers.get(shortMonth[1].toUpperCase());
    return month ? `${shortMonth[3]}-${padDatePart(month)}-${padDatePart(Number(shortMonth[2]))}` : null;
  }
  const longMonth = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (longMonth) {
    const month = birthDateMonthNumbers.get(longMonth[1].slice(0, 3).toUpperCase());
    return month ? `${longMonth[3]}-${padDatePart(month)}-${padDatePart(Number(longMonth[2]))}` : null;
  }
  return null;
}

function tableRowsByHeader(tableData) {
  return (tableData?.rows ?? []).map((row) => Object.fromEntries((tableData.headers ?? []).map((header, index) => [header, row[index]])));
}

function slugifyPlayer(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function playerIndexName(row) {
  return `${row.PLAYER_FIRST_NAME ?? ""} ${row.PLAYER_LAST_NAME ?? ""}`.trim();
}

function playerProfileSlug(row) {
  return String(row.PLAYER_SLUG ?? "").trim() || slugifyPlayer(playerIndexName(row));
}

function nextDataJson(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
}

function findBirthDateInObject(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const found = findBirthDateInObject(item);
      if (found) return found;
    }
    return null;
  }
  for (const [key, value] of Object.entries(candidate)) {
    if (/^BIRTH_?DATE$/i.test(key) || /^BIRTHDATE$/i.test(key)) {
      const normalized = normalizeBirthDate(value);
      if (normalized) return normalized;
    }
  }
  if (Array.isArray(candidate.headers) && Array.isArray(candidate.rowSet)) {
    const index = candidate.headers.findIndex((header) => /^BIRTH_?DATE$/i.test(String(header)) || /^BIRTHDATE$/i.test(String(header)));
    if (index >= 0) {
      for (const row of candidate.rowSet) {
        const normalized = normalizeBirthDate(row[index]);
        if (normalized) return normalized;
      }
    }
  }
  for (const value of Object.values(candidate)) {
    const found = findBirthDateInObject(value);
    if (found) return found;
  }
  return null;
}

async function fetchPlayerProfileBirthdate(playerId, playerSlug) {
  const url = `https://www.nba.com/player/${playerId}/${playerSlug}`;
  const html = await fetchText(`player profile birthdate ${playerId}`, url, nbaPageHeaders);
  const birthDate = findBirthDateInObject(nextDataJson(html)) || normalizeBirthDate(html.match(/BIRTHDATE<\/p><p[^>]*>([^<]+)/)?.[1]);
  if (!birthDate) throw new Error(`Unable to parse player profile birthdate for ${playerId}.`);
  return { birthDate, sourceUrl: url };
}

async function fetchOptionalPlayerProfileBirthdate(playerId, playerSlug) {
  try {
    return await fetchPlayerProfileBirthdate(playerId, playerSlug);
  } catch (error) {
    if (!allowPartial) throw error;
    console.warn(`Skipping player profile birthdate ${playerId}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

async function buildPlayerBirthdatesTable(playerIndexJson, rosterTables, existingSnapshot) {
  const playerIndexTable = table(playerIndexJson);
  const playerIndexRows = tableRowsByHeader(playerIndexTable);
  const birthById = new Map();
  const sourceById = new Map();
  const existingTable = existingSnapshot?.tables?.playerBirthdates;

  if (existingTable?.headers && existingTable?.rows) {
    for (const row of tableRowsByHeader(existingTable)) {
      const playerId = String(row.PLAYER_ID ?? "").trim();
      const birthDate = normalizeBirthDate(row.BIRTH_DATE);
      if (!playerId || !birthDate) continue;
      birthById.set(playerId, birthDate);
      sourceById.set(playerId, {
        sourceName: String(row.SOURCE_NAME ?? "NBA.com player profile"),
        sourceUrl: String(row.SOURCE_URL ?? ""),
        sourceDetail: String(row.SOURCE_DETAIL ?? `PlayerID ${playerId}`)
      });
    }
  }

  for (const [teamId, rosterTable] of Object.entries(rosterTables)) {
    for (const row of tableRowsByHeader(rosterTable)) {
      const playerId = String(row.PLAYER_ID ?? "").trim();
      const birthDate = normalizeBirthDate(row.BIRTH_DATE);
      if (!playerId || !birthDate) continue;
      birthById.set(playerId, birthDate);
      sourceById.set(playerId, {
        sourceName: "NBA Stats commonteamroster",
        sourceUrl: withParams("https://stats.nba.com/stats/commonteamroster", { LeagueID: "00", Season: season, TeamID: teamId }),
        sourceDetail: `TeamID ${teamId}`
      });
    }
  }

  for (const row of playerIndexRows) {
    const playerId = String(row.PERSON_ID ?? "").trim();
    if (!playerId || birthById.has(playerId)) continue;
    const result = await fetchOptionalPlayerProfileBirthdate(playerId, playerProfileSlug(row));
    if (!result) continue;
    birthById.set(playerId, result.birthDate);
    sourceById.set(playerId, {
      sourceName: result.sourceUrl.includes("gleague.nba.com") ? "NBA G League player profile" : "NBA.com player profile",
      sourceUrl: result.sourceUrl,
      sourceDetail: `PlayerID ${playerId}`
    });
  }

  return {
    headers: ["PLAYER_ID", "PLAYER_NAME", "BIRTH_DATE", "SOURCE_NAME", "SOURCE_URL", "SOURCE_DETAIL"],
    rows: playerIndexRows
      .flatMap((row) => {
        const playerId = String(row.PERSON_ID ?? "").trim();
        const birthDate = birthById.get(playerId);
        const source = sourceById.get(playerId);
        return birthDate && source
          ? [[playerId, playerIndexName(row), birthDate, source.sourceName, source.sourceUrl, source.sourceDetail]]
          : [];
      })
      .sort((left, right) => String(left[1]).localeCompare(String(right[1])) || String(left[0]).localeCompare(String(right[0])))
  };
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
  const playerAdvancedRegularUrl = withParams("https://stats.nba.com/stats/leaguedashplayerstats", playerAdvancedDashParams("Regular Season"));
  const playerAdvancedPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashplayerstats", playerAdvancedDashParams("Playoffs"));
  const teamStatsRegularUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", baseDashParams("Regular Season"));
  const teamStatsPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", baseDashParams("Playoffs"));
  const teamAdvancedRegularUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", advancedDashParams("Regular Season"));
  const teamAdvancedPlayoffsUrl = withParams("https://stats.nba.com/stats/leaguedashteamstats", advancedDashParams("Playoffs"));
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
  const playerAdvancedRegular = reuseExistingCore && existingSnapshot?.tables?.playerAdvancedRegular ? snapshotTableToJson(existingSnapshot, "playerAdvancedRegular") : await fetchJson("regular player advanced stats", playerAdvancedRegularUrl);
  const playerAdvancedPlayoffs = reuseExistingCore && existingSnapshot?.tables?.playerAdvancedPlayoffs ? snapshotTableToJson(existingSnapshot, "playerAdvancedPlayoffs") : await fetchOptionalJson("playoff player advanced stats", playerAdvancedPlayoffsUrl) ?? emptyTable;
  const teamStatsRegular = reuseExistingCore ? snapshotTableToJson(existingSnapshot, "teamStatsRegular") : await fetchJson("regular team stats", teamStatsRegularUrl);
  const teamStatsPlayoffs = reuseExistingCore ? snapshotTableToJson(existingSnapshot, "teamStatsPlayoffs") : await fetchOptionalJson("playoff team stats", teamStatsPlayoffsUrl) ?? emptyTable;
  const teamAdvancedRegular = reuseExistingCore && existingSnapshot?.tables?.teamAdvancedRegular ? snapshotTableToJson(existingSnapshot, "teamAdvancedRegular") : await fetchJson("regular team advanced stats", teamAdvancedRegularUrl);
  const teamAdvancedPlayoffs = reuseExistingCore && existingSnapshot?.tables?.teamAdvancedPlayoffs ? snapshotTableToJson(existingSnapshot, "teamAdvancedPlayoffs") : await fetchOptionalJson("playoff team advanced stats", teamAdvancedPlayoffsUrl) ?? emptyTable;
  const playerBioStatsRegular = await fetchJson("regular player bio stats", playerBioStatsRegularUrl);
  const playerIndex = await fetchJson("player index", playerIndexUrl);
  const fetchRequestedJson = allowPartial ? fetchOptionalJson : fetchJson;
  const teamGameLogsRegularMaybe = includeTeamGameLogs ? await fetchRequestedJson("regular team game logs", teamGameLogsRegularUrl) : undefined;
  const teamGameLogsPlayoffsMaybe = includeTeamGameLogs ? await fetchRequestedJson("playoff team game logs", teamGameLogsPlayoffsUrl) : undefined;
  const playerGameLogsRegularMaybe = includePlayerGameLogs ? await fetchRequestedJson("regular player game logs", playerGameLogsRegularUrl) : undefined;
  const playerGameLogsPlayoffsMaybe = includePlayerGameLogs ? await fetchRequestedJson("playoff player game logs", playerGameLogsPlayoffsUrl) : undefined;
  const teamGameLogsRegular = teamGameLogsRegularMaybe ?? (reuseExistingCore && existingSnapshot?.tables?.teamGameLogsRegular ? snapshotTableToJson(existingSnapshot, "teamGameLogsRegular") : emptyTable);
  const teamGameLogsPlayoffs = teamGameLogsPlayoffsMaybe ?? (reuseExistingCore && existingSnapshot?.tables?.teamGameLogsPlayoffs ? snapshotTableToJson(existingSnapshot, "teamGameLogsPlayoffs") : emptyTable);
  const playerGameLogsRegular = playerGameLogsRegularMaybe ?? (reuseExistingCore && existingSnapshot?.tables?.playerGameLogsRegular ? snapshotTableToJson(existingSnapshot, "playerGameLogsRegular") : emptyTable);
  const playerGameLogsPlayoffs = playerGameLogsPlayoffsMaybe ?? (reuseExistingCore && existingSnapshot?.tables?.playerGameLogsPlayoffs ? snapshotTableToJson(existingSnapshot, "playerGameLogsPlayoffs") : emptyTable);

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
  const playerBirthdates = await buildPlayerBirthdatesTable(playerIndex, rosterTables, existingSnapshot);

  const shotCharts = {};
  if (includePlayoffShots) {
    const url = withParams("https://stats.nba.com/stats/shotchartdetail", shotChartParams("Playoffs"));
    shotCharts.playoffs = await fetchJson("playoff shot chart", url);
  }
  if (includeRegularSeasonShots) {
    const url = withParams("https://stats.nba.com/stats/shotchartdetail", shotChartParams("Regular Season"));
    shotCharts.regularSeason = await fetchJson("regular season shot chart", url);
  }

  const fetchRequestedText = allowPartial ? fetchOptionalText : fetchText;
  const basketballReferenceAdvancedHtml = includeBasketballReferenceCrosscheck
    ? await fetchRequestedText("Basketball Reference player advanced stats", basketballReferencePlayerAdvancedUrl, basketballReferenceHeaders)
    : undefined;
  const basketballReferencePerGameHtml = includeBasketballReferenceCrosscheck
    ? await fetchRequestedText("Basketball Reference player per-game stats", basketballReferencePlayerPerGameUrl, basketballReferenceHeaders)
    : undefined;
  const basketballReferenceTeamAdvancedHtml = includeBasketballReferenceCrosscheck
    ? await fetchRequestedText("Basketball Reference team advanced stats", basketballReferenceTeamAdvancedUrl, basketballReferenceHeaders)
    : undefined;
  const basketballReferencePlayerAdvancedRows = basketballReferenceAdvancedHtml
    ? parseBasketballReferenceRows(basketballReferenceAdvancedHtml, "advanced", {
        tsPct: "ts_pct",
        usagePct: "usg_pct",
        assistPct: "ast_pct",
        offensiveReboundPct: "orb_pct",
        defensiveReboundPct: "drb_pct",
        reboundPct: "trb_pct"
      })
    : [];
  const basketballReferencePlayerPerGameRows = basketballReferencePerGameHtml
    ? parseBasketballReferenceRows(basketballReferencePerGameHtml, "per_game_stats", {
        gamesStarted: "games_started",
        efgPct: "efg_pct"
      })
    : [];
  const basketballReferencePlayerAdvancedCrosscheck = buildBasketballReferenceCrosscheck(
    playerAdvancedRegular,
    basketballReferencePlayerAdvancedRows,
    basketballReferencePlayerPerGameRows
  );
  const basketballReferencePlayerCrosscheckMatches = basketballReferencePlayerAdvancedCrosscheck.rows.filter((row) => row[5] === "matched").length;
  const basketballReferencePrimaryPositionMatches = basketballReferencePlayerAdvancedCrosscheck.rows.filter((row) => typeof row[6] === "string" && row[6].length > 0).length;
  const basketballReferenceTeamAdvancedRows = basketballReferenceTeamAdvancedHtml
    ? parseBasketballReferenceTeamAdvancedRows(basketballReferenceTeamAdvancedHtml)
    : [];
  const basketballReferenceTeamAdvancedCrosscheck = buildBasketballReferenceTeamAdvancedCrosscheck(
    teamAdvancedRegular,
    basketballReferenceTeamAdvancedRows
  );
  const basketballReferenceTeamCrosscheckMatches = basketballReferenceTeamAdvancedCrosscheck.rows.filter((row) => row[3] === "matched").length;

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
        "NBA Stats Advanced player and team tables provide official TS%, eFG%, USG%, AST%, rebound percentages, ratings, pace, PIE, and possession fields.",
        "Basketball Reference player advanced, player per-game, and team advanced pages are parsed into lightweight cross-check tables; Basketball Reference per-game Pos and GS supply primary player positions and games started.",
        "The publicReferenceGames metadata pins the currently displayed NBA Finals games to public NBA.com, Basketball Reference, and ESPN game pages.",
        "When NBA Stats leaves selected player bio fields blank, explicit Basketball Reference fallback rows are stored in the playerBioOverrides table.",
        "Player birth dates are stored as ISO dates from NBA Stats commonteamroster and NBA.com/G League profile pages so displayed age can be recalculated daily.",
        "ShotClock derived metrics are calculated locally from official box score totals.",
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
        basketballReferencePlayerAdvanced2026: basketballReferencePlayerAdvancedUrl,
        basketballReferencePlayerPerGame2026: basketballReferencePlayerPerGameUrl,
        basketballReferenceTeamAdvanced2026: `${basketballReferenceTeamAdvancedUrl}#advanced-team`,
        basketballReferenceGlossary: "https://www.basketball-reference.com/about/glossary.html",
        espnFinalsGame5: "https://www.espn.com/nba/game/_/gameId/401859967/knicks-spurs",
        playerStatsRegularUrl,
        playerStatsPlayoffsUrl,
        playerAdvancedRegularUrl,
        playerAdvancedPlayoffsUrl,
        playerBioStatsRegularUrl,
        playerIndexUrl,
        nbaPlayerProfileTemplate: "https://www.nba.com/player/{PLAYER_ID}/{PLAYER_SLUG}",
        nbaGLeaguePlayerProfileTemplate: "https://gleague.nba.com/player/{PLAYER_ID}/{PLAYER_SLUG}",
        teamStatsRegularUrl,
        teamStatsPlayoffsUrl,
        teamAdvancedRegularUrl,
        teamAdvancedPlayoffsUrl,
        teamGameLogsRegularUrl,
        teamGameLogsPlayoffsUrl,
        playerGameLogsRegularUrl,
        playerGameLogsPlayoffsUrl
      },
      coverage: {
        regularSeasonPlayerStats: table(playerStatsRegular).rows.length,
        playoffPlayerStats: table(playerStatsPlayoffs).rows.length,
        regularSeasonPlayerAdvanced: table(playerAdvancedRegular).rows.length,
        playoffPlayerAdvanced: table(playerAdvancedPlayoffs).rows.length,
        basketballReferencePlayerAdvancedRows: basketballReferencePlayerAdvancedRows.length,
        basketballReferencePlayerPerGameRows: basketballReferencePlayerPerGameRows.length,
        basketballReferencePlayerAdvancedCrosschecks: basketballReferencePlayerAdvancedCrosscheck.rows.length,
        basketballReferencePlayerAdvancedMatchedCrosschecks: basketballReferencePlayerCrosscheckMatches,
        basketballReferencePrimaryPositionMatches,
        regularSeasonPlayerBioStats: table(playerBioStatsRegular).rows.length,
        playerIndex: table(playerIndex).rows.length,
        playerBirthdates: playerBirthdates.rows.length,
        externalPlayerBioOverrides: externalPlayerBioOverrides.length,
        regularSeasonTeamStats: table(teamStatsRegular).rows.length,
        playoffTeamStats: table(teamStatsPlayoffs).rows.length,
        regularSeasonTeamAdvanced: table(teamAdvancedRegular).rows.length,
        playoffTeamAdvanced: table(teamAdvancedPlayoffs).rows.length,
        basketballReferenceTeamAdvancedRows: basketballReferenceTeamAdvancedRows.length,
        basketballReferenceTeamAdvancedCrosschecks: basketballReferenceTeamAdvancedCrosscheck.rows.length,
        basketballReferenceTeamAdvancedMatchedCrosschecks: basketballReferenceTeamCrosscheckMatches,
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
      playerAdvancedRegular: table(playerAdvancedRegular),
      playerAdvancedPlayoffs: table(playerAdvancedPlayoffs),
      basketballReferencePlayerAdvancedCrosscheck,
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
      playerBirthdates,
      teamStatsRegular: table(teamStatsRegular),
      teamStatsPlayoffs: table(teamStatsPlayoffs),
      teamAdvancedRegular: table(teamAdvancedRegular),
      teamAdvancedPlayoffs: table(teamAdvancedPlayoffs),
      basketballReferenceTeamAdvancedCrosscheck,
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
  const playerAdvancedRegularTable = table(playerAdvancedRegular);
  const playerBioStatsRegularTable = table(playerBioStatsRegular);
  const playerIndexTable = table(playerIndex);
  const teamStatsRegularTable = table(teamStatsRegular);
  const teamAdvancedRegularTable = table(teamAdvancedRegular);
  const missingBioStatsIds = missingIds(playerStatsRegularTable, "PLAYER_ID", playerBioStatsRegularTable, "PLAYER_ID");
  const missingPlayerIndexIds = missingIds(playerStatsRegularTable, "PLAYER_ID", playerIndexTable, "PERSON_ID");
  const missingPlayerAdvancedIds = missingIds(playerStatsRegularTable, "PLAYER_ID", playerAdvancedRegularTable, "PLAYER_ID");
  const missingPlayerBirthdateIds = missingIds(playerIndexTable, "PERSON_ID", playerBirthdates, "PLAYER_ID");
  const missingTeamAdvancedIds = missingIds(teamStatsRegularTable, "TEAM_ID", teamAdvancedRegularTable, "TEAM_ID");
  assertCoverage(
    !includeBasketballReferenceCrosscheck || basketballReferencePlayerAdvancedRows.length > 0,
    "Basketball Reference player advanced cross-check was requested but no advanced rows were parsed."
  );
  assertCoverage(
    !includeBasketballReferenceCrosscheck || basketballReferencePlayerPerGameRows.length > 0,
    "Basketball Reference player per-game cross-check was requested but no per-game rows were parsed."
  );
  assertCoverage(
    !includeBasketballReferenceCrosscheck || basketballReferencePlayerCrosscheckMatches >= Math.floor(playerAdvancedRegularTable.rows.length * 0.85),
    `Basketball Reference player cross-check matched ${basketballReferencePlayerCrosscheckMatches} of ${playerAdvancedRegularTable.rows.length} NBA Stats player advanced rows.`
  );
  assertCoverage(
    !includeBasketballReferenceCrosscheck || basketballReferenceTeamAdvancedRows.length >= teamAdvancedRegularTable.rows.length,
    "Basketball Reference team advanced cross-check was requested but fewer team rows were parsed than NBA Stats team advanced rows."
  );
  assertCoverage(
    !includeBasketballReferenceCrosscheck || basketballReferenceTeamCrosscheckMatches === teamAdvancedRegularTable.rows.length,
    `Basketball Reference team cross-check matched ${basketballReferenceTeamCrosscheckMatches} of ${teamAdvancedRegularTable.rows.length} NBA Stats team advanced rows.`
  );
  assertCoverage(
    missingBioStatsIds.length === 0,
    `Player bio stats are missing ${missingBioStatsIds.length} regular-season player IDs: ${missingBioStatsIds.slice(0, 10).join(", ")}.`
  );
  assertCoverage(
    missingPlayerIndexIds.length === 0,
    `Player index is missing ${missingPlayerIndexIds.length} regular-season player IDs: ${missingPlayerIndexIds.slice(0, 10).join(", ")}.`
  );
  assertCoverage(
    missingPlayerAdvancedIds.length === 0,
    `Player advanced stats are missing ${missingPlayerAdvancedIds.length} regular-season player IDs: ${missingPlayerAdvancedIds.slice(0, 10).join(", ")}.`
  );
  assertCoverage(
    missingPlayerBirthdateIds.length === 0,
    `Player birth dates are missing ${missingPlayerBirthdateIds.length} player-index IDs: ${missingPlayerBirthdateIds.slice(0, 10).join(", ")}.`
  );
  assertCoverage(
    missingTeamAdvancedIds.length === 0,
    `Team advanced stats are missing ${missingTeamAdvancedIds.length} regular-season team IDs: ${missingTeamAdvancedIds.slice(0, 10).join(", ")}.`
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
