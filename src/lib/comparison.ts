import type { PlayerSeasonAggregate } from "@/lib/types";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";

export type ComparisonWinner = "left" | "right" | "tie";

export type ComparisonMetricKey =
  | "pts"
  | "reb"
  | "ast"
  | "ts_pct"
  | "efg_pct"
  | "usage_rate"
  | "ast_pct"
  | "reb_pct"
  | "pie"
  | "off_rating"
  | "def_rating"
  | "net_rating"
  | "stl"
  | "blk"
  | "turnover_rate";

export const comparisonMetricKeys: ComparisonMetricKey[] = [
  "pts",
  "reb",
  "ast",
  "ts_pct",
  "efg_pct",
  "usage_rate",
  "ast_pct",
  "reb_pct",
  "pie",
  "off_rating",
  "def_rating",
  "net_rating",
  "stl",
  "blk",
  "turnover_rate"
];

const boxRateKeys = ["pts", "reb", "ast", "stl", "blk", "tov", "fga", "threePa", "fta"] as const;
const ratioSimilarityKeys = ["ts_pct", "efg_pct", "usage_rate", "ast_pct", "reb_pct", "turnover_rate", "three_pct", "points_per_shot", "points_per_possession", "pie"];
const minimumSimilarityMinutes = 500;
const minimumSimilarityGames = 30;

export function heightToInches(height: string | null | undefined): number | null {
  if (!height) return null;
  const match = height.trim().match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]);
}

export function positionTokens(position: string): string[] {
  return Array.from(new Set(position.split(/[-/,\s]+/).map((token) => token.trim()).filter(Boolean)));
}

export function positionSimilarity(a: string, b: string): number {
  const left = positionTokens(a);
  const right = positionTokens(b);
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.max(left.length, right.length);
}

export function statWinner(left: number | null, right: number | null, higherIsBetter = true): ComparisonWinner {
  if (left === null && right === null) return "tie";
  if (left === null) return "right";
  if (right === null) return "left";
  if (Math.abs(left - right) < 0.000001) return "tie";
  return higherIsBetter ? (left > right ? "left" : "right") : left < right ? "left" : "right";
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 1;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance) || 1;
}

function gaussianCloseness(left: number | null, right: number | null, spread: number, tolerance = 0.85) {
  if (left === null || right === null || !Number.isFinite(left) || !Number.isFinite(right) || spread <= 0) return 0;
  const z = Math.abs(left - right) / spread;
  return Math.exp(-0.5 * (z / tolerance) ** 2);
}

function perGame(total: number, games: number) {
  return total / Math.max(games, 1);
}

function per36(total: number, minutes: number) {
  return minutes > 0 ? (total / minutes) * 36 : 0;
}

function boxRateValue(row: PlayerSeasonAggregate, key: (typeof boxRateKeys)[number]) {
  return per36(row[key], row.minutes);
}

function boxRateSpread(rows: PlayerSeasonAggregate[], key: (typeof boxRateKeys)[number]) {
  return standardDeviation(rows.map((row) => boxRateValue(row, key)).filter((value) => Number.isFinite(value)));
}

function metricSpread(rows: PlayerSeasonAggregate[], key: string) {
  return standardDeviation(rows.map((row) => calculatePlayerMetric(key, row)).filter((value): value is number => value !== null && Number.isFinite(value)));
}

function physicalCloseness(left: PlayerSeasonAggregate, right: PlayerSeasonAggregate) {
  const heightScore = gaussianCloseness(heightToInches(left.player.height), heightToInches(right.player.height), 3.5, 1);
  const weightScore = gaussianCloseness(left.player.weight, right.player.weight, 24, 1);
  const ageScore = gaussianCloseness(left.player.age, right.player.age, 5, 1.15);
  return average([heightScore, weightScore, ageScore]);
}

function buildSimilarity(left: PlayerSeasonAggregate, right: PlayerSeasonAggregate) {
  const heightDelta = Math.abs((heightToInches(left.player.height) ?? 0) - (heightToInches(right.player.height) ?? 0));
  const weightDelta = Math.abs(left.player.weight - right.player.weight);
  if (heightDelta <= 2 && weightDelta <= 18) return 1;
  if (heightDelta <= 3 && weightDelta <= 28) return 0.75;
  if (heightDelta <= 5 && weightDelta <= 42) return 0.45;
  return 0;
}

function similarityPool(target: PlayerSeasonAggregate, rows: PlayerSeasonAggregate[]) {
  const qualified = rows.filter((row) => row.games >= minimumSimilarityGames && row.minutes >= minimumSimilarityMinutes);
  return qualified.some((row) => row.player.id === target.player.id) ? qualified : [target, ...qualified];
}

function pct(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

type SimilarityContext = {
  pool: PlayerSeasonAggregate[];
  boxSpreads: Map<(typeof boxRateKeys)[number], number>;
  metricSpreads: Map<string, number>;
};

function buildSimilarityContext(target: PlayerSeasonAggregate, rows: PlayerSeasonAggregate[]): SimilarityContext {
  const pool = similarityPool(target, rows);
  return {
    pool,
    boxSpreads: new Map(boxRateKeys.map((key) => [key, boxRateSpread(pool, key)])),
    metricSpreads: new Map(ratioSimilarityKeys.map((key) => [key, metricSpread(pool, key)])),
  };
}

export function playerSimilaritySummary(row: PlayerSeasonAggregate) {
  return {
    height: row.player.height || "N/A",
    weight: row.player.weight ? `${row.player.weight} lb` : "N/A",
    wingspan: "Not loaded",
    position: row.player.position,
    ppg: perGame(row.pts, row.games),
    rpg: perGame(row.reb, row.games),
    apg: perGame(row.ast, row.games),
    ptsPer36: per36(row.pts, row.minutes),
    rebPer36: per36(row.reb, row.minutes),
    astPer36: per36(row.ast, row.minutes),
    stlPer36: per36(row.stl, row.minutes),
    blkPer36: per36(row.blk, row.minutes),
    minutesPerGame: row.minutes / Math.max(row.games, 1),
    games: row.games
  };
}

export function comparisonRows(left: PlayerSeasonAggregate, right: PlayerSeasonAggregate) {
  return comparisonMetricKeys.map((key) => {
    const metric = getMetric(key);
    const leftValue = calculatePlayerMetric(key, left);
    const rightValue = calculatePlayerMetric(key, right);
    return {
      key,
      metric,
      leftValue,
      rightValue,
      winner: statWinner(leftValue, rightValue, metric.higherIsBetter)
    };
  });
}

function similarityScoreWithContext(target: PlayerSeasonAggregate, candidate: PlayerSeasonAggregate, context: SimilarityContext) {
  const boxSpread = (key: (typeof boxRateKeys)[number]) => context.boxSpreads.get(key) ?? 1;
  const ratioSpread = (key: string) => context.metricSpreads.get(key) ?? 1;
  const perMinuteScore = average(
    boxRateKeys.map((key) => gaussianCloseness(boxRateValue(target, key), boxRateValue(candidate, key), boxSpread(key), 0.8))
  );
  const ratioScore = average(
    ratioSimilarityKeys.map((key) => gaussianCloseness(calculatePlayerMetric(key, target), calculatePlayerMetric(key, candidate), ratioSpread(key), 0.82))
  );
  const physicalScore = physicalCloseness(target, candidate);
  const roleScore = positionSimilarity(target.player.position, candidate.player.position);
  const buildScore = buildSimilarity(target, candidate);
  const weightedScore = ratioScore * 0.35 + perMinuteScore * 0.35 + physicalScore * 0.18 + roleScore * 0.09 + buildScore * 0.03;
  const positionBonus = target.player.position === candidate.player.position ? 0.025 : roleScore > 0 ? 0.012 : 0;
  const buildBonus = buildScore >= 0.75 ? 0.018 : buildScore >= 0.45 ? 0.008 : 0;
  const finalScore = Math.min(1, weightedScore ** 1.18 + positionBonus + buildBonus);
  const statTraits = ratioSimilarityKeys
    .map((key) => ({
      label: getMetric(key).shortLabel,
      score: gaussianCloseness(calculatePlayerMetric(key, target), calculatePlayerMetric(key, candidate), ratioSpread(key), 0.82)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((trait) => trait.label);
  const rateTraits = boxRateKeys
    .map((key) => ({
      label: key === "threePa" ? "3PA/36" : `${key.toUpperCase()}/36`,
      score: gaussianCloseness(boxRateValue(target, key), boxRateValue(candidate, key), boxSpread(key), 0.8)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((trait) => trait.label);
  const physicalTraits = [
    { label: "Height", score: gaussianCloseness(heightToInches(target.player.height), heightToInches(candidate.player.height), 3.5, 1) },
    { label: "Weight", score: gaussianCloseness(target.player.weight, candidate.player.weight, 24, 1) },
    { label: "Build", score: buildScore },
    { label: "Position", score: roleScore }
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((trait) => trait.label);

  return {
    score: pct(finalScore),
    ratioScore: pct(ratioScore),
    perMinuteScore: pct(perMinuteScore),
    physicalScore: pct(physicalScore),
    roleScore: pct(roleScore),
    buildScore: pct(buildScore),
    traits: Array.from(new Set([...statTraits, ...rateTraits, ...physicalTraits])).slice(0, 5),
    targetSummary: playerSimilaritySummary(target),
    candidateSummary: playerSimilaritySummary(candidate)
  };
}

export function similarityScore(target: PlayerSeasonAggregate, candidate: PlayerSeasonAggregate, rows: PlayerSeasonAggregate[]) {
  return similarityScoreWithContext(target, candidate, buildSimilarityContext(target, rows));
}

export function similarPlayers(target: PlayerSeasonAggregate, rows: PlayerSeasonAggregate[], limit = 8) {
  const context = buildSimilarityContext(target, rows);
  return context.pool
    .filter((row) => row.player.id !== target.player.id)
    .map((row) => ({ ...similarityScoreWithContext(target, row, context), aggregate: row }))
    .sort((a, b) => b.score - a.score || a.aggregate.player.name.localeCompare(b.aggregate.player.name))
    .slice(0, limit);
}
