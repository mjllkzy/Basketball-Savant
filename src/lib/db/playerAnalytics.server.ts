import type { Player, PlayerSeasonAggregate, Team } from "@/lib/types";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/playerAnalytics.server.ts can only be imported on the server.");
}

export type PlayerOption = {
  slug: string;
  name: string;
  teamAbbreviation: string;
  position: string;
};

export type ComparisonPlayer = {
  player: Player;
  team: Team;
  aggregate: PlayerSeasonAggregate;
  percentiles: {
    tsPct: number;
    usageRate: number;
    pie: number;
  };
};

type ComparisonDbRow = {
  player_slug: string;
  nba_player_id: string | null;
  app_player_id: string | null;
  player_name: string;
  primary_team_id: string | null;
  primary_team_abbreviation: string | null;
  position: string | null;
  height: string | null;
  weight: number | null;
  age: number | null;
  college: string | null;
  country: string | null;
  jersey_number: string | null;
  headshot_url: string | null;
  team_slug: string | null;
  team_name: string | null;
  team_city: string | null;
  conference: "East" | "West" | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  season: string;
  games: number | string | null;
  minutes: number | string | null;
  pts: number | string | null;
  reb: number | string | null;
  ast: number | string | null;
  stl: number | string | null;
  blk: number | string | null;
  tov: number | string | null;
  ts_pct: number | string | null;
  efg_pct: number | string | null;
  usage_rate: number | string | null;
  ast_pct: number | string | null;
  reb_pct: number | string | null;
  turnover_rate: number | string | null;
  off_rating: number | string | null;
  def_rating: number | string | null;
  net_rating: number | string | null;
  pie: number | string | null;
  ts_percentile: number | string | null;
  usage_percentile: number | string | null;
  pie_percentile: number | string | null;
};

type PlayerOptionDbRow = {
  player_slug: string;
  player_name: string;
  primary_team_abbreviation: string | null;
  position: string | null;
};

type MasterCell = {
  raw: unknown;
  numeric: number | null;
};

type MasterFallbackSummary = {
  player_name: string;
  player_slug: string;
  season: string;
  primary_team: string | null;
  sheets: Record<string, Record<string, MasterCell | undefined> | undefined>;
};

const blankHeadshot = "/brand/player-placeholder.png";
const teamIdByAbbreviation: Record<string, string> = {
  ATL: "1610612737",
  BOS: "1610612738",
  BKN: "1610612751",
  CHA: "1610612766",
  CHI: "1610612741",
  CLE: "1610612739",
  DAL: "1610612742",
  DEN: "1610612743",
  DET: "1610612765",
  GSW: "1610612744",
  HOU: "1610612745",
  IND: "1610612754",
  LAC: "1610612746",
  LAL: "1610612747",
  MEM: "1610612763",
  MIA: "1610612748",
  MIL: "1610612749",
  MIN: "1610612750",
  NOP: "1610612740",
  NYK: "1610612752",
  OKC: "1610612760",
  ORL: "1610612753",
  PHI: "1610612755",
  PHX: "1610612756",
  POR: "1610612757",
  SAC: "1610612758",
  SAS: "1610612759",
  TOR: "1610612761",
  UTA: "1610612762",
  WAS: "1610612764",
};

function numeric(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function total(value: number | string | null, games: number) {
  return (numeric(value) ?? 0) * Math.max(games, 1);
}

function masterNumber(cell: MasterCell | undefined) {
  return typeof cell?.numeric === "number" && Number.isFinite(cell.numeric) ? cell.numeric : null;
}

function masterPercentage(cell: MasterCell | undefined) {
  const value = masterNumber(cell);
  if (value === null) return null;
  return Math.abs(value) > 1 ? value / 100 : value;
}

function masterText(cell: MasterCell | undefined) {
  if (cell?.raw === null || cell?.raw === undefined) return null;
  const value = String(cell.raw).trim();
  return value && value !== "N/A" ? value : null;
}

function masterHeight(cell: MasterCell | undefined) {
  const value = masterText(cell);
  if (!value) return "N/A";
  const direct = value.match(/^(\d+)-(\d+)$/);
  if (direct) return `${Number(direct[1])}-${Number(direct[2])}`;
  const excelDate = value.match(/^\d{4}-(\d{2})-(\d{2})/);
  return excelDate ? `${Number(excelDate[1])}-${Number(excelDate[2])}` : "N/A";
}

function percentile(value: number | null, values: number[]) {
  if (value === null || !values.length) return 0;
  const belowOrEqual = values.filter((candidate) => candidate <= value).length;
  return Math.round(((belowOrEqual - 1) / Math.max(values.length - 1, 1)) * 100);
}

function mapComparisonRow(row: ComparisonDbRow): ComparisonPlayer {
  const games = Math.round(numeric(row.games) ?? 0);
  const teamId = row.primary_team_id ?? row.primary_team_abbreviation ?? "";
  const player: Player = {
    id: row.nba_player_id ?? row.app_player_id ?? row.player_slug,
    name: row.player_name,
    slug: row.player_slug,
    teamId,
    position: row.position ?? "N/A",
    height: row.height ?? "N/A",
    weight: row.weight ?? 0,
    age: row.age ?? 0,
    draftYear: 0,
    draftRound: 0,
    draftPick: 0,
    college: row.college ?? undefined,
    country: row.country ?? undefined,
    headshotUrl: row.headshot_url ?? blankHeadshot,
    active: true,
    jerseyNumber: row.jersey_number ?? "",
    role: "2025-26 masterfile player",
    skill: 0,
    createdAt: "",
    updatedAt: "",
  };
  const team: Team = {
    id: teamId,
    slug: row.team_slug ?? (row.primary_team_abbreviation ?? "nba").toLowerCase(),
    name: row.team_name ?? row.primary_team_abbreviation ?? "NBA",
    abbreviation: row.primary_team_abbreviation ?? "NBA",
    city: row.team_city ?? "",
    conference: row.conference ?? "East",
    division: row.division ?? "NBA",
    primaryColor: row.primary_color ?? "#101820",
    secondaryColor: row.secondary_color ?? "#0f766e",
  };
  const aggregate: PlayerSeasonAggregate = {
    player,
    team,
    season: row.season,
    games,
    minutes: total(row.minutes, games),
    pts: total(row.pts, games),
    reb: total(row.reb, games),
    oreb: 0,
    dreb: 0,
    ast: total(row.ast, games),
    stl: total(row.stl, games),
    blk: total(row.blk, games),
    tov: total(row.tov, games),
    pf: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    plusMinus: 0,
    possessions: 0,
    onCourtPossessions: 0,
    teamPossessions: 0,
    teamMinutes: 0,
    teamFga: 0,
    teamFta: 0,
    teamTov: 0,
    officialEfgPct: numeric(row.efg_pct),
    officialTsPct: numeric(row.ts_pct),
    usagePct: numeric(row.usage_rate),
    assistPct: numeric(row.ast_pct),
    offensiveReboundPct: null,
    defensiveReboundPct: null,
    reboundPct: numeric(row.reb_pct),
    turnoverPct: numeric(row.turnover_rate),
    offRating: numeric(row.off_rating),
    defRating: numeric(row.def_rating),
    netRating: numeric(row.net_rating),
    pace: null,
    pie: numeric(row.pie),
    pointsAllowedOnCourt: 0,
    expectedPoints: 0,
    actualMinusExpectedPoints: 0,
    expectedFgPct: 0,
    rimAttempts: 0,
    shortMidAttempts: 0,
    longMidAttempts: 0,
    cornerThreeAttempts: 0,
    aboveBreakThreeAttempts: 0,
    pullUpAttempts: 0,
    catchAndShootAttempts: 0,
    assistedAttempts: 0,
    unassistedRimAttempts: 0,
    paintTouches: 0,
    drives: 0,
    touches: 0,
    potentialAssists: 0,
    secondaryAssists: 0,
    reboundChances: 0,
    contestedRebounds: 0,
    deflections: 0,
    chargesDrawn: 0,
    stocks: total(row.stl, games) + total(row.blk, games),
    opponentExpectedFgPct: 0,
    opponentActualMinusExpectedFg: 0,
    rimContests: 0,
    shotContests: 0,
    lineupNet: numeric(row.net_rating) ?? 0,
    recentGameScores: [],
  };

  return {
    player,
    team,
    aggregate,
    percentiles: {
      tsPct: Math.round(numeric(row.ts_percentile) ?? 0),
      usageRate: Math.round(numeric(row.usage_percentile) ?? 0),
      pie: Math.round(numeric(row.pie_percentile) ?? 0),
    },
  };
}

async function loadMasterFallbackSummaries() {
  const summariesModule = await import("@/lib/data/generated/master-player-summaries.json");
  return summariesModule.default as MasterFallbackSummary[];
}

async function jsonPlayerOptions(): Promise<PlayerOption[]> {
  const summaries = await loadMasterFallbackSummaries();
  return summaries.map((summary) => ({
    slug: summary.player_slug,
    name: summary.player_name,
    teamAbbreviation: summary.primary_team ?? "NBA",
    position: "N/A",
  }));
}

async function jsonComparisonPlayers(slugs: string[]): Promise<ComparisonPlayer[]> {
  const summaries = await loadMasterFallbackSummaries();
  const selected = new Set(slugs);
  const tsValues = summaries.flatMap((summary) => {
    const value = masterPercentage(summary.sheets["General - Advanced"]?.ts_pct);
    return value === null ? [] : [value];
  });
  const usageValues = summaries.flatMap((summary) => {
    const value = masterPercentage(summary.sheets["General - Advanced"]?.usg_pct);
    return value === null ? [] : [value];
  });
  const pieValues = summaries.flatMap((summary) => {
    const value = masterPercentage(summary.sheets["General - Advanced"]?.pie);
    return value === null ? [] : [value];
  });
  const rows = summaries.flatMap((summary): ComparisonDbRow[] => {
    if (!selected.has(summary.player_slug)) return [];
    const traditional = summary.sheets["General - Traditional"] ?? {};
    const advanced = summary.sheets["General - Advanced"] ?? {};
    const bios = summary.sheets.Bios ?? {};
    const teamAbbreviation = summary.primary_team ?? "NBA";
    const teamId = teamIdByAbbreviation[teamAbbreviation] ?? teamAbbreviation;
    const tsPct = masterPercentage(advanced.ts_pct);
    const usageRate = masterPercentage(advanced.usg_pct);
    const pie = masterPercentage(advanced.pie);
    return [{
      player_slug: summary.player_slug,
      nba_player_id: null,
      app_player_id: summary.player_slug,
      player_name: summary.player_name,
      primary_team_id: teamId,
      primary_team_abbreviation: teamAbbreviation,
      position: "N/A",
      height: masterHeight(bios.height),
      weight: masterNumber(bios.weight),
      age: masterNumber(bios.age ?? traditional.age),
      college: masterText(bios.college),
      country: masterText(bios.country),
      jersey_number: null,
      headshot_url: null,
      team_slug: teamAbbreviation.toLowerCase(),
      team_name: teamAbbreviation,
      team_city: "",
      conference: null,
      division: null,
      primary_color: null,
      secondary_color: null,
      season: summary.season,
      games: masterNumber(traditional.gp ?? advanced.gp),
      minutes: masterNumber(traditional.min ?? advanced.min),
      pts: masterNumber(traditional.pts),
      reb: masterNumber(traditional.reb),
      ast: masterNumber(traditional.ast),
      stl: masterNumber(traditional.stl),
      blk: masterNumber(traditional.blk),
      tov: masterNumber(traditional.tov),
      ts_pct: tsPct,
      efg_pct: masterPercentage(advanced.efg_pct),
      usage_rate: usageRate,
      ast_pct: masterPercentage(advanced.ast_pct),
      reb_pct: masterPercentage(advanced.reb_pct),
      turnover_rate: masterPercentage(advanced.to_ratio),
      off_rating: masterNumber(advanced.offrtg),
      def_rating: masterNumber(advanced.defrtg),
      net_rating: masterNumber(advanced.netrtg),
      pie,
      ts_percentile: percentile(tsPct, tsValues),
      usage_percentile: percentile(usageRate, usageValues),
      pie_percentile: percentile(pie, pieValues),
    }];
  });
  const bySlug = new Map(rows.map((row) => [row.player_slug, mapComparisonRow(row)]));
  return slugs.flatMap((slug) => {
    const player = bySlug.get(slug);
    return player ? [player] : [];
  });
}

export async function listComparisonPlayerOptions(): Promise<PlayerOption[]> {
  try {
    const result = await queryDatabase<PlayerOptionDbRow>(
      `
      SELECT
        p.player_slug,
        p.player_name,
        p.primary_team_abbreviation,
        p.position
      FROM players p
      JOIN current_player_season_summaries s USING (player_slug)
      ORDER BY p.player_name
      `,
    );
    if (!result) return jsonPlayerOptions();
    return result.rows.map((row) => ({
      slug: row.player_slug,
      name: row.player_name,
      teamAbbreviation: row.primary_team_abbreviation ?? "NBA",
      position: row.position ?? "N/A",
    }));
  } catch {
    return jsonPlayerOptions();
  }
}

export async function loadComparisonPlayers(slugs: string[]): Promise<ComparisonPlayer[]> {
  const requested = Array.from(new Set(slugs.filter(Boolean))).slice(0, 2);
  if (!requested.length) return [];

  try {
    const result = await queryDatabase<ComparisonDbRow>(
      `
      WITH ranked AS (
        SELECT
          s.*,
          percent_rank() OVER (ORDER BY s.ts_pct) * 100 AS ts_percentile,
          percent_rank() OVER (ORDER BY s.usage_rate) * 100 AS usage_percentile,
          percent_rank() OVER (ORDER BY s.pie) * 100 AS pie_percentile
        FROM current_player_season_summaries s
      )
      SELECT
        p.player_slug,
        p.nba_player_id,
        p.app_player_id,
        p.player_name,
        p.primary_team_id,
        p.primary_team_abbreviation,
        p.position,
        p.height,
        p.weight,
        p.age,
        p.college,
        p.country,
        p.jersey_number,
        p.headshot_url,
        t.slug AS team_slug,
        t.name AS team_name,
        t.city AS team_city,
        t.conference,
        t.division,
        t.primary_color,
        t.secondary_color,
        ranked.*
      FROM ranked
      JOIN players p USING (player_slug)
      LEFT JOIN teams t ON t.id = p.primary_team_id
      WHERE p.player_slug = ANY($1::text[])
      `,
      [requested],
    );
    if (!result) return jsonComparisonPlayers(requested);
    const bySlug = new Map(result.rows.map((row) => [row.player_slug, mapComparisonRow(row)]));
    return requested.flatMap((slug) => {
      const player = bySlug.get(slug);
      return player ? [player] : [];
    });
  } catch {
    return jsonComparisonPlayers(requested);
  }
}
