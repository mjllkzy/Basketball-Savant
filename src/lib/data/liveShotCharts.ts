import { cache } from "react";
import { nbaShotChartResultSetToTable, mapNbaShotChartTable } from "@/lib/data/shotChartMapper";
import { officialMetadata } from "@/lib/data/official";
import type { Shot } from "@/lib/types";

const nbaStatsHeaders = {
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nba.com",
  Referer: "https://www.nba.com/",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true"
};

function teamShotChartUrl(teamId: string, seasonType: "Regular Season" | "Playoffs") {
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
    Season: officialMetadata.season,
    SeasonSegment: "",
    SeasonType: seasonType,
    TeamID: teamId,
    VsConference: "",
    VsDivision: ""
  });
  return `https://stats.nba.com/stats/shotchartdetail?${params.toString()}`;
}

function firstResultSet(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as { resultSets?: unknown[]; resultsets?: unknown[] };
  return body.resultSets?.[0] ?? body.resultsets?.[0];
}

export const getLiveTeamShotChart = cache(async (teamId: string): Promise<Shot[]> => {
  try {
    const response = await fetch(teamShotChartUrl(teamId, "Regular Season"), {
      headers: nbaStatsHeaders,
      next: { revalidate: 60 * 60 * 12 }
    });
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    return mapNbaShotChartTable(nbaShotChartResultSetToTable(firstResultSet(payload)), officialMetadata.season);
  } catch {
    return [];
  }
});
