export type EntityType = "player" | "team" | "lineup" | "game";
export type SeasonType = "Regular Season" | "Playoffs";

export type Team = {
  id: string;
  slug: string;
  name: string;
  abbreviation: string;
  city: string;
  conference: "East" | "West";
  division: string;
  primaryColor: string;
  secondaryColor: string;
};

export type Player = {
  id: string;
  name: string;
  slug: string;
  teamId: string;
  position: string;
  height: string;
  weight: number;
  age: number;
  birthDate?: string;
  draftYear: number;
  draftRound: number;
  draftPick: number;
  college?: string;
  country?: string;
  rosterStatus?: string;
  headshotUrl: string;
  active: boolean;
  handedness?: "Left" | "Right";
  jerseyNumber: string;
  role: string;
  skill: number;
  createdAt: string;
  updatedAt: string;
};

export type Game = {
  id: string;
  date: string;
  season: string;
  seasonType: SeasonType;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: "Final" | "Scheduled" | "Live";
  neutralSite?: boolean;
  arena?: string;
};

export type Lineup = {
  id: string;
  gameId: string;
  teamId: string;
  player1Id: string;
  player2Id: string;
  player3Id: string;
  player4Id: string;
  player5Id: string;
  startTime: string;
  endTime: string;
  possessions: number;
  offensiveRating: number;
  defensiveRating: number;
  netRating: number;
};

export type Possession = {
  id: string;
  gameId: string;
  season: string;
  quarter: number;
  clock: string;
  offenseTeamId: string;
  defenseTeamId: string;
  lineupOffenseId: string;
  lineupDefenseId: string;
  possessionNumber: number;
  startType: string;
  playType: string;
  primaryPlayerId: string;
  screenerPlayerId?: string;
  passerPlayerId?: string;
  defenderPlayerId?: string;
  resultType: string;
  points: number;
  expectedPoints: number;
  actualMinusExpected: number;
  turnover: boolean;
  foulDrawn: boolean;
  offensiveRebound: boolean;
  transition: boolean;
  clutch: boolean;
  garbageTime: boolean;
  createdAt: string;
};

export type ShotZone =
  | "Rim"
  | "Short Midrange"
  | "Long Midrange"
  | "Corner Three"
  | "Above Break Three";

export type Shot = {
  id: string;
  possessionId: string;
  gameId: string;
  season: string;
  playerId: string;
  teamId: string;
  defenderId?: string;
  assisterId?: string;
  quarter: number;
  clock: string;
  x: number;
  y: number;
  shotDistance: number;
  shotZone: ShotZone;
  shotType: "Layup" | "Dunk" | "Floater" | "Pull-Up" | "Catch-and-Shoot" | "Stepback" | "Hook" | "Jump Shot";
  pointsValue: 2 | 3;
  made: boolean;
  assisted: boolean;
  dribblesBeforeShot: number;
  touchTime: number;
  defenderDistance: number;
  closestDefender: string;
  contestLevel: "Open" | "Light" | "Tight" | "Smothered";
  shotClock: number;
  expectedFgPct: number;
  expectedPoints: number;
  actualMinusExpected: number;
  playType: string;
  isClutch: boolean;
  isTransition: boolean;
  isCatchAndShoot: boolean;
  isPullUp: boolean;
  isAtRim: boolean;
  isCornerThree: boolean;
  isAboveBreakThree: boolean;
};

export type Pass = {
  id: string;
  possessionId: string;
  passerId: string;
  receiverId: string;
  gameId: string;
  season: string;
  quarter: number;
  clock: string;
  passType: string;
  ledToShot: boolean;
  ledToAssist: boolean;
  potentialAssist: boolean;
  secondaryAssist: boolean;
  expectedAssistValue: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
};

export type Rebound = {
  id: string;
  gameId: string;
  possessionId: string;
  playerId: string;
  teamId: string;
  reboundType: "Offensive" | "Defensive";
  contested: boolean;
  chance: boolean;
  distance: number;
  boxoutByPlayerId?: string;
};

export type DefensiveEvent = {
  id: string;
  gameId: string;
  possessionId: string;
  defenderId: string;
  offensivePlayerId: string;
  eventType: string;
  shotContested: boolean;
  rimContest: boolean;
  deflection: boolean;
  steal: boolean;
  block: boolean;
  chargeDrawn: boolean;
  closeoutSpeed?: number;
  matchupDuration?: number;
  expectedPointsAllowed: number;
  actualPointsAllowed: number;
};

export type PlayerGameStat = {
  id: string;
  gameId: string;
  playerId: string;
  teamId: string;
  opponentTeamId: string;
  minutes: number;
  pts: number;
  reb: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  plusMinus: number;
};

export type TeamGameStat = {
  id: string;
  gameId: string;
  teamId: string;
  opponentTeamId: string;
  minutes: number;
  pts: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  possessions: number;
};

export type MetricCategory =
  | "Traditional"
  | "Efficiency"
  | "Shot Quality"
  | "Shot Profile"
  | "Creation"
  | "Play Type"
  | "Defense"
  | "Rebounding"
  | "Movement/Tracking"
  | "Lineup"
  | "Trend";

export type MetricDefinition = {
  id: string;
  key: string;
  label: string;
  shortLabel: string;
  category: MetricCategory;
  description: string;
  formula: string;
  unit: "number" | "percentage" | "rating" | "points" | "per75" | "rank";
  higherIsBetter: boolean;
  precision: number;
  sourceType: "box" | "event" | "tracking" | "model" | "derived";
  requiresTracking: boolean;
  sampleQualifier: string;
  glossaryMarkdown: string;
};

export type MetricValue = {
  id: string;
  metricKey: string;
  entityType: EntityType;
  entityId: string;
  season: string;
  seasonType: SeasonType;
  value: number;
  percentile: number;
  rank: number;
  sampleSize: number;
};

export type PlayerSeasonAggregate = {
  player: Player;
  team: Team;
  season: string;
  games: number;
  minutes: number;
  pts: number;
  reb: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  plusMinus: number;
  possessions: number;
  onCourtPossessions: number;
  teamPossessions: number;
  teamMinutes: number;
  teamFga: number;
  teamFta: number;
  teamTov: number;
  officialEfgPct: number | null;
  officialTsPct: number | null;
  usagePct: number | null;
  assistPct: number | null;
  offensiveReboundPct: number | null;
  defensiveReboundPct: number | null;
  reboundPct: number | null;
  turnoverPct: number | null;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
  pace: number | null;
  pie: number | null;
  pointsAllowedOnCourt: number;
  expectedPoints: number;
  actualMinusExpectedPoints: number;
  expectedFgPct: number;
  rimAttempts: number;
  shortMidAttempts: number;
  longMidAttempts: number;
  cornerThreeAttempts: number;
  aboveBreakThreeAttempts: number;
  pullUpAttempts: number;
  catchAndShootAttempts: number;
  assistedAttempts: number;
  unassistedRimAttempts: number;
  paintTouches: number;
  drives: number;
  touches: number;
  potentialAssists: number;
  secondaryAssists: number;
  reboundChances: number;
  contestedRebounds: number;
  deflections: number;
  chargesDrawn: number;
  stocks: number;
  opponentExpectedFgPct: number;
  opponentActualMinusExpectedFg: number;
  rimContests: number;
  shotContests: number;
  lineupNet: number;
  recentGameScores: Array<{ gameId: string; date: string; pts: number; ts: number; usage: number; net: number }>;
};

export type TeamSeasonAggregate = {
  team: Team;
  season: string;
  games: number;
  wins: number;
  losses: number;
  pts: number;
  ptsAllowed: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  possessions: number;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
  assistPct: number | null;
  offensiveReboundPct: number | null;
  defensiveReboundPct: number | null;
  reboundPct: number | null;
  turnoverPct: number | null;
  officialEfgPct: number | null;
  officialTsPct: number | null;
  pie: number | null;
  expectedPoints: number;
  rimFrequency: number;
  threeFrequency: number;
  pace: number;
  shotQuality: number;
};
