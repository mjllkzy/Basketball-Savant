import masterSummariesJson from "@/lib/data/generated/master-player-summaries.json";
import {
  officialDatasetVersion,
  officialMetadata,
  officialPlayers,
  officialPlayerSeasonAggregates,
  officialTeams
} from "@/lib/data/official";
import { blankPlayerHeadshotUrl } from "@/lib/playerImages";
import type { Player, PlayerSeasonAggregate, Team } from "@/lib/types";

type MasterCell = {
  raw: unknown;
  numeric: number | null;
  original_column_name: string;
};

type MasterSheet = Record<string, MasterCell | undefined>;

type MasterRuntimeSummary = {
  player_name: string;
  player_slug: string;
  season: string;
  season_type: string;
  primary_team: string | null;
  teams: string[];
  source_sheets: string[];
  sheets: Record<string, MasterSheet | undefined>;
};

const masterSummaries = masterSummariesJson as MasterRuntimeSummary[];

function normalizedName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rawText(cell: MasterCell | undefined): string | undefined {
  if (!cell || cell.raw === null || cell.raw === undefined) return undefined;
  const value = String(cell.raw).trim();
  if (!value || value === "N/A" || value.toLowerCase() === "none") return undefined;
  return value;
}

function numeric(cell: MasterCell | undefined): number | null {
  return typeof cell?.numeric === "number" && Number.isFinite(cell.numeric) ? cell.numeric : null;
}

function percentage(cell: MasterCell | undefined): number | null {
  const value = numeric(cell);
  if (value === null) return null;
  return Math.abs(value) > 1 ? value / 100 : value;
}

function firstNumber(...cells: Array<MasterCell | undefined>): number | null {
  for (const cell of cells) {
    const value = numeric(cell);
    if (value !== null) return value;
  }
  return null;
}

function firstPercentage(...cells: Array<MasterCell | undefined>): number | null {
  for (const cell of cells) {
    const value = percentage(cell);
    if (value !== null) return value;
  }
  return null;
}

function heightFromMaster(cell: MasterCell | undefined, fallback: string) {
  const raw = rawText(cell);
  if (!raw) return fallback || "N/A";
  const direct = raw.match(/^(\d+)-(\d+)$/);
  if (direct) return `${Number(direct[1])}-${Number(direct[2])}`;

  const dateHeight = raw.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (dateHeight) return `${Number(dateHeight[1])}-${Number(dateHeight[2])}`;

  return fallback || "N/A";
}

function draftNumber(cell: MasterCell | undefined, fallback: number) {
  return numeric(cell) ?? fallback ?? 0;
}

function cleanBioText(cell: MasterCell | undefined, fallback?: string) {
  return rawText(cell) ?? fallback;
}

function perGameTotal(perGame: number | null, games: number, fallback: number) {
  return perGame === null ? fallback : perGame * games;
}

function madeFromPct(
  madeCell: MasterCell | undefined,
  attemptsCell: MasterCell | undefined,
  pctCell: MasterCell | undefined,
): number | null {
  const attempts = numeric(attemptsCell);
  const pct = percentage(pctCell);
  if (attempts !== null && pct !== null) return attempts * pct;
  return numeric(madeCell);
}

function teamForSummary(summary: MasterRuntimeSummary, fallbackPlayer?: Player): Team {
  const byAbbreviation = officialTeams.find((team) => team.abbreviation === summary.primary_team);
  const fallbackTeam = fallbackPlayer ? officialTeams.find((team) => team.id === fallbackPlayer.teamId) : undefined;
  return byAbbreviation ?? fallbackTeam ?? officialTeams[0];
}

const officialPlayerByName = new Map(officialPlayers.map((player) => [normalizedName(player.name), player]));
const officialPlayerByNameAndTeam = new Map(
  officialPlayers.map((player) => {
    const team = officialTeams.find((item) => item.id === player.teamId);
    return [`${normalizedName(player.name)}|${team?.abbreviation ?? ""}`, player] as const;
  })
);
const officialAggregateByPlayerId = new Map(officialPlayerSeasonAggregates.map((row) => [row.player.id, row]));

const playersByMasterSlug = new Map<string, Player>();
const aggregateRows: PlayerSeasonAggregate[] = masterSummaries.map((summary) => {
  const officialPlayer =
    officialPlayerByNameAndTeam.get(`${normalizedName(summary.player_name)}|${summary.primary_team ?? ""}`) ??
    officialPlayerByName.get(normalizedName(summary.player_name));
  const fallbackAggregate = officialPlayer ? officialAggregateByPlayerId.get(officialPlayer.id) : undefined;
  const team = teamForSummary(summary, officialPlayer);
  const traditional = summary.sheets["General - Traditional"] ?? {};
  const advanced = summary.sheets["General - Advanced"] ?? {};
  const bios = summary.sheets.Bios ?? {};
  const defense = summary.sheets["General - Defense"] ?? {};
  const misc = summary.sheets["General - Misc"] ?? {};
  const games = Math.round(firstNumber(traditional.gp, advanced.gp, bios.gp) ?? fallbackAggregate?.games ?? 0);
  const minutesPerGame = firstNumber(traditional.min, advanced.min) ?? (fallbackAggregate ? fallbackAggregate.minutes / Math.max(fallbackAggregate.games, 1) : 0);
  const totalMinutes = minutesPerGame * Math.max(games, 1);
  const fgaPerGame = numeric(traditional.fga);
  const threePaPerGame = numeric(traditional.three_pa);
  const ftaPerGame = numeric(traditional.fta);

  const player: Player = {
    id: officialPlayer?.id ?? `master-${summary.player_slug}`,
    name: summary.player_name,
    slug: officialPlayer?.slug ?? summary.player_slug,
    teamId: team.id,
    position: officialPlayer?.position ?? "N/A",
    height: heightFromMaster(bios.height, officialPlayer?.height ?? "N/A"),
    weight: Math.round(firstNumber(bios.weight) ?? officialPlayer?.weight ?? 0),
    age: Math.round(firstNumber(bios.age, traditional.age, advanced.age) ?? officialPlayer?.age ?? 0),
    draftYear: draftNumber(bios.draft_year, officialPlayer?.draftYear ?? 0),
    draftRound: draftNumber(bios.draft_round, officialPlayer?.draftRound ?? 0),
    draftPick: draftNumber(bios.draft_number, officialPlayer?.draftPick ?? 0),
    college: cleanBioText(bios.college, officialPlayer?.college),
    country: cleanBioText(bios.country, officialPlayer?.country),
    rosterStatus: officialPlayer?.rosterStatus,
    headshotUrl: officialPlayer?.headshotUrl ?? blankPlayerHeadshotUrl,
    active: true,
    handedness: officialPlayer?.handedness,
    jerseyNumber: officialPlayer?.jerseyNumber ?? "",
    role: "Excel masterfile player",
    skill: officialPlayer?.skill ?? 0,
    createdAt: officialMetadata.generatedAt,
    updatedAt: officialMetadata.generatedAt,
  };
  playersByMasterSlug.set(summary.player_slug, player);

  const fgmPerGame = madeFromPct(traditional.fgm, traditional.fga, traditional.fg_pct);
  const threePmPerGame = madeFromPct(traditional.three_pm, traditional.three_pa, traditional.three_p_pct);
  const ftmPerGame = madeFromPct(traditional.ftm, traditional.fta, traditional.ft_pct);
  const possessions = firstNumber(advanced.poss) ?? fallbackAggregate?.possessions ?? 0;

  return {
    player,
    team,
    season: summary.season,
    games,
    minutes: totalMinutes,
    pts: perGameTotal(firstNumber(traditional.pts, bios.pts), games, fallbackAggregate?.pts ?? 0),
    reb: perGameTotal(firstNumber(traditional.reb, bios.reb), games, fallbackAggregate?.reb ?? 0),
    oreb: perGameTotal(firstNumber(traditional.oreb), games, fallbackAggregate?.oreb ?? 0),
    dreb: perGameTotal(firstNumber(traditional.dreb), games, fallbackAggregate?.dreb ?? 0),
    ast: perGameTotal(firstNumber(traditional.ast, bios.ast), games, fallbackAggregate?.ast ?? 0),
    stl: perGameTotal(firstNumber(traditional.stl, defense.stl), games, fallbackAggregate?.stl ?? 0),
    blk: perGameTotal(firstNumber(traditional.blk, defense.blk, misc.blk), games, fallbackAggregate?.blk ?? 0),
    tov: perGameTotal(firstNumber(traditional.tov), games, fallbackAggregate?.tov ?? 0),
    pf: perGameTotal(firstNumber(traditional.pf), games, fallbackAggregate?.pf ?? 0),
    fgm: perGameTotal(fgmPerGame, games, fallbackAggregate?.fgm ?? 0),
    fga: perGameTotal(fgaPerGame, games, fallbackAggregate?.fga ?? 0),
    threePm: perGameTotal(threePmPerGame, games, fallbackAggregate?.threePm ?? 0),
    threePa: perGameTotal(threePaPerGame, games, fallbackAggregate?.threePa ?? 0),
    ftm: perGameTotal(ftmPerGame, games, fallbackAggregate?.ftm ?? 0),
    fta: perGameTotal(ftaPerGame, games, fallbackAggregate?.fta ?? 0),
    plusMinus: perGameTotal(firstNumber(traditional.plus_per, advanced.netrtg), games, fallbackAggregate?.plusMinus ?? 0),
    possessions,
    onCourtPossessions: possessions || fallbackAggregate?.onCourtPossessions || 0,
    teamPossessions: fallbackAggregate?.teamPossessions ?? 0,
    teamMinutes: fallbackAggregate?.teamMinutes ?? 0,
    teamFga: fallbackAggregate?.teamFga ?? 0,
    teamFta: fallbackAggregate?.teamFta ?? 0,
    teamTov: fallbackAggregate?.teamTov ?? 0,
    officialEfgPct: firstPercentage(advanced.efg_pct),
    officialTsPct: firstPercentage(advanced.ts_pct, bios.ts_pct),
    usagePct: firstPercentage(advanced.usg_pct, bios.usg_pct),
    assistPct: firstPercentage(advanced.ast_pct, bios.ast_pct),
    offensiveReboundPct: firstPercentage(advanced.oreb_pct, bios.oreb_pct),
    defensiveReboundPct: firstPercentage(advanced.dreb_pct, bios.dreb_pct),
    reboundPct: firstPercentage(advanced.reb_pct),
    turnoverPct: firstPercentage(advanced.to_ratio),
    offRating: firstNumber(advanced.offrtg) ?? null,
    defRating: firstNumber(advanced.defrtg) ?? null,
    netRating: firstNumber(advanced.netrtg, bios.netrtg) ?? null,
    pace: firstNumber(advanced.pace) ?? null,
    pie: firstPercentage(advanced.pie),
    pointsAllowedOnCourt: fallbackAggregate?.pointsAllowedOnCourt ?? 0,
    expectedPoints: fallbackAggregate?.expectedPoints ?? 0,
    actualMinusExpectedPoints: fallbackAggregate?.actualMinusExpectedPoints ?? 0,
    expectedFgPct: fallbackAggregate?.expectedFgPct ?? 0,
    rimAttempts: fallbackAggregate?.rimAttempts ?? 0,
    shortMidAttempts: fallbackAggregate?.shortMidAttempts ?? 0,
    longMidAttempts: fallbackAggregate?.longMidAttempts ?? 0,
    cornerThreeAttempts: fallbackAggregate?.cornerThreeAttempts ?? 0,
    aboveBreakThreeAttempts: fallbackAggregate?.aboveBreakThreeAttempts ?? 0,
    pullUpAttempts: fallbackAggregate?.pullUpAttempts ?? 0,
    catchAndShootAttempts: fallbackAggregate?.catchAndShootAttempts ?? 0,
    assistedAttempts: fallbackAggregate?.assistedAttempts ?? 0,
    unassistedRimAttempts: fallbackAggregate?.unassistedRimAttempts ?? 0,
    paintTouches: fallbackAggregate?.paintTouches ?? 0,
    drives: fallbackAggregate?.drives ?? 0,
    touches: fallbackAggregate?.touches ?? 0,
    potentialAssists: fallbackAggregate?.potentialAssists ?? 0,
    secondaryAssists: fallbackAggregate?.secondaryAssists ?? 0,
    reboundChances: fallbackAggregate?.reboundChances ?? 0,
    contestedRebounds: fallbackAggregate?.contestedRebounds ?? 0,
    deflections: fallbackAggregate?.deflections ?? 0,
    chargesDrawn: fallbackAggregate?.chargesDrawn ?? 0,
    stocks: perGameTotal(firstNumber(traditional.stl, defense.stl), games, 0) + perGameTotal(firstNumber(traditional.blk, defense.blk, misc.blk), games, 0),
    opponentExpectedFgPct: fallbackAggregate?.opponentExpectedFgPct ?? 0,
    opponentActualMinusExpectedFg: fallbackAggregate?.opponentActualMinusExpectedFg ?? 0,
    rimContests: fallbackAggregate?.rimContests ?? 0,
    shotContests: fallbackAggregate?.shotContests ?? 0,
    lineupNet: firstNumber(traditional.plus_per, advanced.netrtg) ?? fallbackAggregate?.lineupNet ?? 0,
    recentGameScores: fallbackAggregate?.recentGameScores ?? [],
  };
});

export const masterPlayers = aggregateRows.map((row) => row.player);
export const masterPlayerSeasonAggregates = aggregateRows;
export const masterPlayerAliasBySlug = new Map(Array.from(playersByMasterSlug.entries()).map(([slug, player]) => [slug, player.id]));
export const masterPlayerSlugById = new Map(Array.from(playersByMasterSlug.entries()).map(([slug, player]) => [player.id, slug]));
export const masterDatasetVersion = `${officialDatasetVersion}+excel-master-${masterSummaries.length}-players`;
export const masterMetadata = {
  ...officialMetadata,
  dataProvider: "NBA Excel masterfile, NBA Stats, and Basketball Reference cross-checks",
  coverage: {
    ...officialMetadata.coverage,
    regularSeasonPlayerStats: masterPlayerSeasonAggregates.length,
  },
};
