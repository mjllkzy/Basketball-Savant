import { UPCOMING_SEASON } from "@/lib/seasons";
import type { RuntimePlayerFallback, RuntimeTeamFallback } from "@/lib/data/runtimeFallbacks.server";
import type { TeamSeasonAggregate } from "@/lib/types";

export type CurrentRosterTransaction = {
  season: typeof UPCOMING_SEASON;
  playerSlug: string;
  playerName: string;
  nbaPlayerId: string;
  fromTeamAbbreviation: string;
  toTeamAbbreviation: string;
  sourceLabel: string;
  sourceUrl: string;
  officialDate: string;
};

const officialNbaTradeTracker = "https://www.nba.com/news/2026-offseason-trade-tracker";

export const currentRosterTransactions: CurrentRosterTransaction[] = [
  {
    season: UPCOMING_SEASON,
    playerSlug: "devin-carter",
    playerName: "Devin Carter",
    nbaPlayerId: "1642269",
    fromTeamAbbreviation: "SAC",
    toTeamAbbreviation: "ATL",
    sourceLabel: "NBA.com 2026 offseason trade tracker",
    sourceUrl: officialNbaTradeTracker,
    officialDate: "2026-06-30",
  },
  {
    season: UPCOMING_SEASON,
    playerSlug: "ja-morant",
    playerName: "Ja Morant",
    nbaPlayerId: "1629630",
    fromTeamAbbreviation: "MEM",
    toTeamAbbreviation: "POR",
    sourceLabel: "NBA.com 2026 offseason trade tracker",
    sourceUrl: officialNbaTradeTracker,
    officialDate: "2026-06-30",
  },
  {
    season: UPCOMING_SEASON,
    playerSlug: "jerami-grant",
    playerName: "Jerami Grant",
    nbaPlayerId: "203924",
    fromTeamAbbreviation: "POR",
    toTeamAbbreviation: "MEM",
    sourceLabel: "NBA.com 2026 offseason trade tracker",
    sourceUrl: officialNbaTradeTracker,
    officialDate: "2026-06-30",
  },
  {
    season: UPCOMING_SEASON,
    playerSlug: "kris-murray",
    playerName: "Kris Murray",
    nbaPlayerId: "1631200",
    fromTeamAbbreviation: "POR",
    toTeamAbbreviation: "MEM",
    sourceLabel: "NBA.com 2026 offseason trade tracker",
    sourceUrl: officialNbaTradeTracker,
    officialDate: "2026-06-30",
  },
];

const transactionBySlug = new Map(currentRosterTransactions.map((move) => [move.playerSlug, move]));

const nullStatFields = {
  games: 0,
  games_started: null,
  minutes: null,
  pts: null,
  reb: null,
  ast: null,
  stl: null,
  blk: null,
  tov: null,
  fg_pct: null,
  three_pct: null,
  ft_pct: null,
  ts_pct: null,
  efg_pct: null,
  usage_rate: null,
  ast_pct: null,
  reb_pct: null,
  turnover_rate: null,
  off_rating: null,
  def_rating: null,
  net_rating: null,
  pie: null,
} satisfies Partial<RuntimePlayerFallback>;

export function currentTeamOverrideForPlayerSlug(playerSlug: string) {
  return transactionBySlug.get(playerSlug);
}

export function currentTeamAbbreviationForPlayerSlug(playerSlug: string, fallbackTeamAbbreviation: string | null | undefined) {
  return transactionBySlug.get(playerSlug)?.toTeamAbbreviation ?? fallbackTeamAbbreviation ?? "NBA";
}

export function buildUpcomingRosterRows(players: RuntimePlayerFallback[], teams: RuntimeTeamFallback[]): RuntimePlayerFallback[] {
  const teamByAbbreviation = new Map(teams.map((team) => [team.abbreviation, team]));
  return players.map((player) => {
    const move = transactionBySlug.get(player.player_slug);
    const team = move ? teamByAbbreviation.get(move.toTeamAbbreviation) : undefined;
    return {
      ...player,
      ...nullStatFields,
      team_id: team?.team_id ?? player.team_id,
      team_abbreviation: team?.abbreviation ?? player.team_abbreviation,
    };
  });
}

function emptyTeamAggregate(row: RuntimeTeamFallback, season: string): TeamSeasonAggregate {
  return {
    team: {
      id: row.team_id,
      slug: row.slug,
      abbreviation: row.abbreviation,
      city: row.city,
      name: row.name,
      conference: row.conference ?? "East",
      division: row.division ?? "NBA",
      primaryColor: row.primary_color ?? "#101820",
      secondaryColor: row.secondary_color ?? "#0f766e",
    },
    season,
    games: 0,
    wins: 0,
    losses: 0,
    pts: 0,
    ptsAllowed: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    dreb: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    possessions: 0,
    offRating: null,
    defRating: null,
    netRating: null,
    assistPct: null,
    offensiveReboundPct: null,
    defensiveReboundPct: null,
    reboundPct: null,
    turnoverPct: null,
    officialEfgPct: null,
    officialTsPct: null,
    pie: null,
    expectedPoints: 0,
    rimFrequency: 0,
    threeFrequency: 0,
    pace: 0,
    shotQuality: 0,
  };
}

export function buildUpcomingTeamSummaries(teams: RuntimeTeamFallback[], season = UPCOMING_SEASON): TeamSeasonAggregate[] {
  const uniqueTeams = new Map<string, RuntimeTeamFallback>();
  for (const team of teams) {
    if (!uniqueTeams.has(team.team_id)) uniqueTeams.set(team.team_id, team);
  }
  return Array.from(uniqueTeams.values()).map((team) => emptyTeamAggregate(team, season));
}
